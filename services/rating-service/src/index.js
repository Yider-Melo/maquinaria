const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
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
app.use(cors({ origin: process.env.GATEWAY_URL || 'http://localhost:3000', credentials: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'rating-service', status: 'running' });
});

app.use('/', routes);

app.use(errorHandler);

app.listen(PORT, () => {
    logger.info('Rating Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando rating-service');
    process.exit(0);
});
