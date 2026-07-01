// Cliente RabbitMQ para comunicacion asincrona entre microservicios.
// Usa un exchange tipo 'topic' para que los mensajes se filtren por patron.
// Ejemplo: 'machinery.*' recibe todos los eventos de maquinaria.

const amqp = require('amqplib');

const EXCHANGE_NAME = 'rentamaq.events';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel = null;

// Conecta a RabbitMQ, crea el canal y declara el exchange si no existe.
async function connect(rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost') {
    if (channel) return channel;
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
    return channel;
}

// Publica un evento en el exchange con una routing key especifica.
// Los mensajes son persistentes para no perderse si RabbitMQ se reinicia.
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

// Se suscribe a eventos que coincidan con un patron de routing key.
// El handler se ejecuta por cada mensaje recibido.
// Los mensajes se confirman (ack) solo si el handler no lanza error.
async function subscribeToEvent(routingKeyPattern, handler, queueName) {
    if (!channel) await connect();
    const q = await channel.assertQueue(queueName || '', { exclusive: !queueName, durable: true });
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKeyPattern);
    channel.consume(q.queue, (msg) => {
        if (msg) {
            try {
                const content = JSON.parse(msg.content.toString());
                handler(content);
                channel.ack(msg);
            } catch (error) {
                console.error(`Error processing event ${routingKeyPattern}:`, error);
                channel.nack(msg, false, false);
            }
        }
    });
}

// Cierra la conexion a RabbitMQ gracefulmente.
async function close() {
    if (channel) await channel.close();
    if (connection) await connection.close();
}

module.exports = {
    connect,
    publishEvent,
    subscribeToEvent,
    close
};
