const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { eventBus, errorHandler, correlationId, requestLogger } = require('shared');
const { createNotificationDirect } = require('./services/notificationService');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('notification-service');

eventBus.setLogger(logger);

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

const app = express();
const PORT = process.env.PORT || 3007;
app.locals.logger = logger;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'development' ? ['http://localhost:4200', 'http://127.0.0.1:4200'] : ['http://localhost:3000']), credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'notification-service', status: 'running' });
});

app.use('/', routes);

app.use(errorHandler);

function notifyGatewayViaHttp(userId, titulo, mensaje) {
    const body = JSON.stringify({ userId, titulo, mensaje });
    const req = http.request(`${GATEWAY_URL}/_ws/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.write(body);
    req.end();
}

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        logger.info('Conectado a RabbitMQ');

        eventBus.subscribeToEvent('booking.*', async (event) => {
            const { data } = event;
            try {
                await createNotificationDirect(
                    data.usuario_id,
                    data.tipo,
                    data.titulo,
                    data.mensaje,
                    data.referencia_id,
                    data.referencia_tipo
                );
                notifyGatewayViaHttp(data.usuario_id, data.titulo, data.mensaje);
                logger.info('Notificación creada vía evento:', { usuarioId: data.usuario_id });
            } catch (err) {
                logger.error('Error procesando evento de notificación:', { message: err.message, stack: err.stack });
            }
        }, 'notification-booking-queue');

    } catch (err) {
        logger.warn('RabbitMQ no disponible, usando endpoint HTTP directo:', { message: err.message });
    }
    logger.info('Notification Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando notification-service');
    process.exit(0);
});
