const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const compression = require('compression');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const routes = require('./routes');
const { authLimiter, userLimiter } = require('./middleware/rateLimiter');
const httpLogger = require('./middleware/httpLogger');
const { cors, securityHeaders } = require('./config/security');
const { errorHandler, getJwtSecret, correlationId } = require('shared');
const createServiceLogger = require('shared/logger');

const logger = createServiceLogger('api-gateway');

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason?.message || reason, stack: reason?.stack });
});

const app = express();
app.locals.logger = logger;
const server = http.createServer(app);
let httpsServer = null;

const corsConfig = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : (process.env.NODE_ENV === 'development' ? 'http://localhost:4200' : false),
    methods: ['GET', 'POST']
};
const io = new Server(server, { cors: corsConfig });

const PORT = process.env.PORT || 3000;

app.use(correlationId);
app.use(compression({ level: 6 }));
app.use(cors);
app.options('*', cors);

app.use(securityHeaders);

app.use(httpLogger);
// No usar body parsers globales aquí porque http-proxy-middleware necesita
// el stream original del request para reenviar correctamente las peticiones
// a los microservicios. El parsing se aplica solo a rutas locales que no pasan por proxy.

app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'api-gateway', status: 'running' });
});

function internalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Acceso denegado' } });
    }
    next();
}

app.post('/_ws/notify', internalAuth, express.json({ limit: '1mb' }), (req, res) => {
    const { userId, titulo, mensaje } = req.body;
    if (!userId || !titulo) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'userId y titulo son requeridos' } });
    }
    io.to(`user:${userId}`).emit('notification', { titulo, mensaje });
    logger.info('Notification sent', { userId, titulo });
    res.json({ success: true });
});

// Rate limiting aplicado a auth y otras rutas
app.use('/api/v1/auth', authLimiter);
app.use('/', userLimiter);
app.use('/', routes);

// Middleware de autenticacion para WebSocket: verifica el token JWT al conectar
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        logger.warn('WebSocket connection attempted without token');
        return next(new Error('Token requerido'));
    }
    try {
        socket.user = jwt.verify(token, getJwtSecret());
        logger.info('WebSocket user authenticated', { userId: socket.user.id });
        next();
    } catch (err) {
        logger.warn('WebSocket authentication failed', { error: err.message });
        next(new Error('Token inválido'));
    }
});

// Gestion de conexiones WebSocket: el usuario se une a una sala privada
io.on('connection', (socket) => {
    logger.info('WebSocket connected', { userId: socket.user?.id });
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
        logger.info('WebSocket disconnected', { userId: socket.user?.id });
    });

    socket.on('error', (error) => {
        logger.error('WebSocket error', { userId: socket.user?.id, error: error.message });
    });
});

app.set('io', io);

app.use(errorHandler);

const CERT_PATH = process.env.SSL_CERT_PATH;
const KEY_PATH = process.env.SSL_KEY_PATH;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!CERT_PATH || !KEY_PATH || !fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH))) {
    logger.error('HTTPS requerido en producción. Configure SSL_CERT_PATH y SSL_KEY_PATH');
    process.exit(1);
}

if (CERT_PATH && KEY_PATH && fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    httpsServer = https.createServer({
        cert: fs.readFileSync(CERT_PATH),
        key: fs.readFileSync(KEY_PATH)
    }, app);
    httpsServer.listen(PORT, () => {
        logger.info(`API Gateway iniciado con HTTPS`, {
            port: PORT,
            environment: process.env.NODE_ENV || 'development'
        });
    });
} else {
    server.listen(PORT, () => {
        logger.info(`API Gateway iniciado con HTTP`, {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            corsEnabled: true,
            securityHeadersEnabled: true
        });
    });
}

function shutdown() {
    logger.info('SIGTERM recibido, cerrando servidor');
    const servers = [];
    if (server) servers.push(server);
    if (typeof httpsServer !== 'undefined' && httpsServer) servers.push(httpsServer);
    Promise.all(servers.map(s => new Promise(resolve => s.close(resolve)))).then(() => {
        logger.info('API Gateway cerrado');
        process.exit(0);
    });
}
process.on('SIGTERM', shutdown);

module.exports = app;
