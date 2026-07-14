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

app.listen(PORT, () => {
    logger.info('Auth Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando auth-service');
    process.exit(0);
});

module.exports = app;
