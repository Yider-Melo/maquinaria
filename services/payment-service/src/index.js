const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const pool = require('./db');
const { errorHandler, correlationId, requestLogger } = require('shared');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('payment-service');

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
const PORT = process.env.PORT || 3005;
app.locals.logger = logger;

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'development' ? ['http://localhost:4200', 'http://127.0.0.1:4200'] : ['http://localhost:3000']), credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, service: 'payment-service', status: 'running', db: 'connected' });
    } catch {
        res.status(503).json({ success: false, service: 'payment-service', status: 'degraded', db: 'disconnected' });
    }
});

app.use('/', routes);

app.use(errorHandler);

async function ensurePaymentSchema() {
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS propietario_id UUID');
}

logger.info('Payment Service modo: consulta directa (sin RabbitMQ)');

ensurePaymentSchema()
    .then(() => {
        app.listen(PORT, () => {
            logger.info('Payment Service iniciado', { port: PORT });
        });
    })
    .catch((err) => {
        logger.error('Error asegurando esquema de pago:', err);
        process.exit(1);
    });

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando payment-service');
    process.exit(0);
});
