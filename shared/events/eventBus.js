const amqp = require('amqplib');

const EXCHANGE_NAME = 'rentamaq.events';
const EXCHANGE_TYPE = 'topic';
const RECONNECT_DELAY_MS = 5000;

let connection = null;
let channel = null;
let loggerInstance = null;
let reconnectTimer = null;
let connectingPromise = null;
const subscriptions = [];

function setLogger(logger) {
    loggerInstance = logger;
}

function log(level, message, meta) {
    if (loggerInstance) {
        loggerInstance[level](message, meta);
    } else if (level === 'error') {
        console.error(message, meta || '');
    } else {
        console.warn(message, meta || '');
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    log('warn', 'RabbitMQ no disponible. Reintentando conexión...', { delayMs: RECONNECT_DELAY_MS });
    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        try {
            await connect();
        } catch { }
    }, RECONNECT_DELAY_MS);
}

async function bindQueue(sub) {
    const ch = channel;
    if (!ch) return;
    const q = await ch.assertQueue(sub.queueName || '', { exclusive: !sub.queueName, durable: true });
    await ch.bindQueue(q.queue, EXCHANGE_NAME, sub.pattern);
    ch.prefetch(1);
    ch.consume(q.queue, (msg) => {
        if (msg) {
            try {
                const content = JSON.parse(msg.content.toString());
                sub.handler(content);
                ch.ack(msg);
            } catch (error) {
                if (loggerInstance) {
                    loggerInstance.error(`Error processing event ${sub.pattern}:`, {
                        error: error.message,
                        stack: error.stack
                    });
                }
                ch.nack(msg, false, false);
            }
        }
    });
}

async function connect(rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost') {
    if (channel) return channel;
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
        const conn = await amqp.connect(rabbitmqUrl, { heartbeat: 30 });
        connection = conn;
        const ch = await conn.createChannel();
        await ch.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
        channel = ch;

        connection.on('close', () => {
            log('warn', 'Conexión RabbitMQ cerrada. Reconectando...');
            channel = null;
            connection = null;
            scheduleReconnect();
        });
        connection.on('error', () => { });
        channel.on('error', () => { });

        for (const sub of subscriptions) {
            try {
                await bindQueue(sub);
            } catch (err) {
                log('warn', 'No se pudo re-suscribir a eventos', { pattern: sub.pattern, error: err.message });
            }
        }
        return channel;
    })();

    try {
        const ch = await connectingPromise;
        return ch;
    } catch (err) {
        channel = null;
        connection = null;
        log('warn', 'No se pudo conectar a RabbitMQ', { error: err.message });
        scheduleReconnect();
        throw err;
    } finally {
        connectingPromise = null;
    }
}

async function publishEvent(routingKey, data) {
    try {
        if (!channel) await connect();
        if (!channel) return false;
        const message = Buffer.from(JSON.stringify({
            event: routingKey,
            data,
            timestamp: new Date().toISOString(),
            eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        return channel.publish(EXCHANGE_NAME, routingKey, message, { persistent: true });
    } catch (err) {
        if (loggerInstance) {
            loggerInstance.warn('No se pudo publicar evento', { routingKey, error: err.message });
        } else {
            console.warn('No se pudo publicar evento y logger no disponible:', routingKey, err.message);
        }
        return false;
    }
}

async function subscribeToEvent(routingKeyPattern, handler, queueName) {
    const sub = { pattern: routingKeyPattern, handler, queueName };
    subscriptions.push(sub);
    if (!channel) {
        try {
            await connect();
        } catch { }
    }
    if (channel) {
        try {
            await bindQueue(sub);
        } catch (err) {
            log('warn', 'No se pudo suscribir a eventos', { pattern: routingKeyPattern, error: err.message });
        }
    }
}

async function close() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (channel) await channel.close();
    if (connection) await connection.close();
    channel = null;
    connection = null;
}

module.exports = {
    connect,
    publishEvent,
    subscribeToEvent,
    close,
    setLogger
};
