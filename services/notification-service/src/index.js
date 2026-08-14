const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { eventBus, errorHandler, correlationId, requestLogger, emailService } = require('shared');
const { createNotificationDirect, getUserEmail, notifyGatewayViaHttp, broadcastRefreshViaHttp } = require('./services/notificationService');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('notification-service');

eventBus.setLogger(logger);

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

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

function getEmailTemplate(tipo, data) {
    const map = {
        'booking.created': emailService.sendBookingCreated,
        'booking.confirmed': emailService.sendBookingConfirmed,
        'booking.rejected': emailService.sendBookingRejected,
        'booking.cancelled': emailService.sendBookingCancelled,
        'booking.completed': emailService.sendBookingCompleted,
        'payment.confirmed': emailService.sendPaymentConfirmed,
        'payment.released': emailService.sendPaymentReleased,
        'payment.refunded': emailService.sendPaymentRefunded,
        'rating.created': emailService.sendRatingCreated,
    };
    return map[tipo] || null;
}

async function sendEmailNotification(tipo, data) {
    const sendFn = getEmailTemplate(tipo);
    if (!sendFn) return;

    if (!data.usuario_id) return;

    try {
        const user = await getUserEmail(data.usuario_id);
        if (!user || !user.email) return;

        const nombre = user.nombre || 'usuario';
        await sendFn(user.email, nombre, data);
    } catch (err) {
        logger.error('Error enviando email de notificación:', { tipo, error: err.message });
    }
}

async function handleBookingEvent(event) {
    const { data, event: tipo } = event;
    try {
        // El refresco en vivo se emite siempre, incluso si el evento no trae
        // datos suficientes para crear una notificación (p. ej. payment.updated).
        broadcastRefreshViaHttp(tipo, data?.referencia_id, data?.referencia_tipo);

        const tipoFinal = data.tipo || tipo;
        if (!data.usuario_id || !tipoFinal || !data.titulo || !data.mensaje) {
            return;
        }

        await createNotificationDirect(
            data.usuario_id,
            tipoFinal,
            data.titulo,
            data.mensaje,
            data.referencia_id,
            data.referencia_tipo
        );
        notifyGatewayViaHttp(data.usuario_id, tipoFinal, data.titulo, data.mensaje, data.referencia_id, data.referencia_tipo);
        await sendEmailNotification(tipoFinal, data);
        logger.info('Notificación creada vía evento:', { usuarioId: data.usuario_id, tipo: tipoFinal });
    } catch (err) {
        logger.error('Error procesando evento de notificación:', { message: err.message, stack: err.stack });
    }
}

async function handleMachineryEvent(event) {
    const { data, event: tipo } = event;
    try {
        // Sin notificación en base de datos para no saturar al propietario:
        // solo se emite un refresco global para que las vistas se actualicen en vivo.
        broadcastRefreshViaHttp(tipo, data?.id, 'maquinaria');
        logger.info('Refresco de maquinaria emitido:', { tipo, id: data?.id });
    } catch (err) {
        logger.error('Error procesando evento de maquinaria:', { message: err.message, stack: err.stack });
    }
}

app.listen(PORT, async () => {
    try {
        await emailService.configure();
    } catch (err) {
        logger.warn('Error configurando servicio de email:', { message: err.message });
    }

    try {
        await eventBus.connect();
        logger.info('Conectado a RabbitMQ');
    } catch (err) {
        logger.warn('RabbitMQ no disponible, usando endpoint HTTP directo:', { message: err.message });
    }

    eventBus.subscribeToEvent('booking.*', handleBookingEvent, 'notification-booking-queue');
    eventBus.subscribeToEvent('payment.*', handleBookingEvent, 'notification-payment-queue');
    eventBus.subscribeToEvent('machinery.*', handleMachineryEvent, 'notification-machinery-queue');
    eventBus.subscribeToEvent('rating.*', handleBookingEvent, 'notification-rating-queue');

    logger.info('Notification Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando notification-service');
    process.exit(0);
});
