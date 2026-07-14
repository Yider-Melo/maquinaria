const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { eventBus, errorHandler, correlationId, requestLogger } = require('shared');
const createServiceLogger = require('../../../shared/logger');

const logger = createServiceLogger('machinery-service');

eventBus.setLogger(logger);

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
const PORT = process.env.PORT || 3002;
app.locals.logger = logger;

app.use(helmet());
app.use(cors({ origin: process.env.GATEWAY_URL || 'http://localhost:3000', credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'machinery-service', status: 'running', db: 'connected' });
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
    logger.info('Machinery Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando machinery-service');
    process.exit(0);
});
