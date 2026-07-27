const express = require('express');
const helmet = require('helmet');
const createServiceLogger = require('../../../shared/logger');
const { errorHandler, correlationId, requestLogger, eventBus } = require('shared');
const pool = require('./db');
const routes = require('./routes');

const logger = createServiceLogger('auth-service');

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
const PORT = process.env.PORT || 3001;
app.locals.logger = logger;

eventBus.setLogger(logger);

app.use(helmet());
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, service: 'auth-service', status: 'running', db: 'connected' });
    } catch {
        res.status(503).json({ success: false, service: 'auth-service', status: 'degraded', db: 'disconnected' });
    }
});

app.use('/', routes);

app.use(errorHandler);

async function ensureBankAccountSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cuentas_bancarias (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            banco VARCHAR(50) NOT NULL,
            tipo_cuenta VARCHAR(20) NOT NULL DEFAULT 'ahorros',
            numero_cuenta VARCHAR(50) NOT NULL,
            titular VARCHAR(200) NOT NULL,
            tipo_documento VARCHAR(5) NOT NULL DEFAULT 'CC',
            numero_documento VARCHAR(20) NOT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(usuario_id)
        )
    `);
    logger.info('Esquema de cuentas_bancarias asegurado');
}

ensureBankAccountSchema().then(() => {
    app.listen(PORT, () => {
        logger.info('Auth Service iniciado', { port: PORT });
    });
}).catch((err) => {
    logger.error('Error asegurando esquema de cuentas bancarias:', err);
    process.exit(1);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando auth-service');
    process.exit(0);
});

module.exports = app;
