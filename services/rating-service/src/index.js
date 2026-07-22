const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const pool = require('./db');
const { errorHandler, correlationId, requestLogger } = require('shared');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('rating-service');

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
const PORT = process.env.PORT || 3006;
app.locals.logger = logger;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'development' ? ['http://localhost:4200', 'http://127.0.0.1:4200'] : ['http://localhost:3000']), credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'rating-service', status: 'running' });
});

app.use('/', routes);

app.use(errorHandler);

app.listen(PORT, async () => {
    try {
        await pool.query(`ALTER TABLE calificacion DROP CONSTRAINT IF EXISTS calificacion_reserva_id_key`);
        await pool.query(`DROP INDEX IF EXISTS idx_calificacion_reserva_usuario`);
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_calificacion_reserva_usuario ON calificacion(reserva_id, calificador_id)`);
        logger.info('Migración: UNIQUE de reserva_id eliminado, nuevo unique compuesto creado');
    } catch (err) {
        logger.warn('No se pudo migrar calificacion:', { message: err.message });
    }
    logger.info('Rating Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando rating-service');
    process.exit(0);
});
