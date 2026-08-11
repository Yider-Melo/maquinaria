const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const pool = require('./db');
const scheduler = require('./scheduler');
const { eventBus, errorHandler, correlationId, requestLogger } = require('shared');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('booking-service');

eventBus.setLogger(logger);

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
const PORT = process.env.PORT || 3004;
app.locals.logger = logger;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'development' ? ['http://localhost:4200', 'http://127.0.0.1:4200'] : ['http://localhost:3000']), credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'booking-service', status: 'running' });
});

app.use('/', routes);

app.use(errorHandler);

app.listen(PORT, async () => {
    try {
        await eventBus.connect();
        logger.info('Conectado a RabbitMQ');
    } catch (err) {
        logger.warn('RabbitMQ no disponible, eventos no se publicarán:', { message: err.message });
    }
    try {
        await pool.query(`ALTER TABLE reserva DROP CONSTRAINT IF EXISTS reserva_estado_check`);
        await pool.query(`ALTER TABLE reserva ADD CONSTRAINT reserva_estado_check CHECK (estado IN ('pendiente', 'confirmada', 'pagada', 'en_curso', 'completada', 'cancelada', 'rechazada'))`);
        logger.info('Migración: estado pagada agregado al CHECK de reserva');
    } catch (err) {
        logger.warn('No se pudo migrar el CHECK de estado:', { message: err.message });
    }
    try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
        await pool.query(`ALTER TABLE reserva DROP CONSTRAINT IF EXISTS reserva_no_overlap`);
        await pool.query(`ALTER TABLE reserva ADD CONSTRAINT reserva_no_overlap
            EXCLUDE USING gist (
                maquinaria_id WITH =,
                daterange(fecha_inicio, fecha_fin) WITH &&
            ) WHERE (estado IN ('pendiente', 'confirmada', 'pagada', 'en_curso'))`);
        logger.info('Migración: constraint reserva_no_overlap (EXCLUDE daterange) agregado');
    } catch (err) {
        logger.warn('No se pudo agregar el constraint reserva_no_overlap:', { message: err.message });
    }
    scheduler.start();
    logger.info('Booking Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando booking-service');
    process.exit(0);
});
