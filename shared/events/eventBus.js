const amqp = require('amqplib');

const EXCHANGE_NAME = 'rentamaq.events';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel = null;
let loggerInstance = null;

function setLogger(logger) {
    loggerInstance = logger;
}

async function connect(rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost') {
    if (channel) return channel;
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
    return channel;
}

async function publishEvent(routingKey, data) {
    if (!channel) await connect();
    const message = Buffer.from(JSON.stringify({
        event: routingKey,
        data,
        timestamp: new Date().toISOString(),
        eventId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
    channel.publish(EXCHANGE_NAME, routingKey, message, { persistent: true });
}

async function subscribeToEvent(routingKeyPattern, handler, queueName) {
    if (!channel) await connect();
    const q = await channel.assertQueue(queueName || '', { exclusive: !queueName, durable: true });
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKeyPattern);
    channel.prefetch(1);
    channel.consume(q.queue, (msg) => {
        if (msg) {
            try {
                const content = JSON.parse(msg.content.toString());
                handler(content);
                channel.ack(msg);
            } catch (error) {
                if (loggerInstance) {
                    loggerInstance.error(`Error processing event ${routingKeyPattern}:`, {
                        error: error.message,
                        stack: error.stack
                    });
                }
                channel.nack(msg, false, false);
            }
        }
    });
}

async function close() {
    if (channel) await channel.close();
    if (connection) await connection.close();
}

module.exports = {
    connect,
    publishEvent,
    subscribeToEvent,
    close,
    setLogger
};
