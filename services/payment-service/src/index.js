const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const pool = require('./db');
const { errorHandler, correlationId, requestLogger } = require('shared');
const createServiceLogger = require('../../../shared/logger');
const paymentProvider = require('./config/paymentProvider');

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
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS comision DECIMAL(12, 2) DEFAULT 0');
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS monto_propietario DECIMAL(12, 2) DEFAULT 0');
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_estado VARCHAR(20) DEFAULT \'pendiente\'');
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_intentos INTEGER DEFAULT 0');
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_error TEXT');
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS payout_completado_en TIMESTAMP');
    await pool.query('ALTER TABLE pago ADD COLUMN IF NOT EXISTS liberado_en TIMESTAMP');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS movimiento (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            pago_id UUID NOT NULL REFERENCES pago(id) ON DELETE CASCADE,
            reserva_id UUID NOT NULL,
            tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('comision_plataforma','pago_propietario','reembolso','ajuste')),
            monto DECIMAL(12, 2) NOT NULL,
            descripcion TEXT,
            referencia_tipo VARCHAR(50),
            referencia_id VARCHAR(255),
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_movimiento_pago ON movimiento(pago_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_movimiento_tipo ON movimiento(tipo)');
}

logger.info('Payment Service modo: consulta directa (sin RabbitMQ)');

if (paymentProvider.configure()) {
    logger.info(`Proveedor de pagos: ${paymentProvider.PROVIDER} configurado correctamente`);
} else {
    logger.warn(`Proveedor de pagos: ${paymentProvider.PROVIDER} en modo simulado`);
}

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
