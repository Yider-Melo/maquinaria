// Punto de entrada del servicio de autenticacion.
// Configura Express con middleware y monta las rutas de /auth.
const express = require('express');
const createServiceLogger = require('../../../shared/logger');
const routes = require('./routes');

const app = express();
const logger = createServiceLogger('auth-service');
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
    logger.info('Health check');
    res.json({ success: true, service: 'auth-service', status: 'running' });
});

app.use('/', routes);

// Manejo de errores
app.use((err, req, res, next) => {
    logger.error('Auth service error', {
        message: err.message,
        stack: err.stack,
        path: req.path
    });
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'production' ? 'Error en autenticación' : err.message
        }
    });
});

app.listen(PORT, () => {
    logger.info('Auth Service iniciado', { port: PORT });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando auth-service');
    process.exit(0);
});

module.exports = app;
