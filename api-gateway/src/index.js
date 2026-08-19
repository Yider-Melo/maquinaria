const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const compression = require('compression');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const routes = require('./routes');
const { authLimiter, userLimiter, accountLimiter } = require('./middleware/rateLimiter');
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

const publicPath = '/app/api-gateway/public';
if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    app.get('*', (_req, res, next) => {
        if (_req.path.startsWith('/api/') || _req.path === '/health' || _req.path.startsWith('/_ws/')) return next();
        res.sendFile(publicPath + '/index.html');
    });
}

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
    io.to(`user:${userId}`).emit('notification', {
        titulo,
        mensaje,
        tipo: req.body.tipo,
        referencia_id: req.body.referencia_id,
        referencia_tipo: req.body.referencia_tipo
    });
    logger.info('Notification sent', { userId, titulo });
    res.json({ success: true });
});

// Emite un evento de refresco en tiempo real a todos los clientes conectados.
// Lo usan los microservicios para avisar que un recurso público cambió
// (p. ej. reservas, pagos o maquinaria) y que las vistas se recarguen solas.
app.post('/_ws/broadcast', internalAuth, express.json({ limit: '1mb' }), (req, res) => {
    const { tipo } = req.body;
    if (!tipo) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'tipo es requerido' } });
    }
    io.to('global').emit('refresh', {
        tipo,
        referencia_id: req.body.referencia_id,
        referencia_tipo: req.body.referencia_tipo
    });
    logger.info('Refresh broadcast sent', { tipo, referencia_id: req.body.referencia_id });
    res.json({ success: true });
});

// Rate limiting aplicado a auth y otras rutas
app.use('/api/v1/auth', authLimiter);
// Límite por cuenta (email) sobre el login: solo fallos, 5 por cuenta cada 15 min.
app.post('/api/v1/auth/login', accountLimiter);
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
    // Sala global para recibir eventos de refresco en tiempo real
    socket.join('global');

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
const certsAvailable = CERT_PATH && KEY_PATH && fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH);

// Si se configuran certificados pero no existen, es un error de configuración.
// En producción el TLS normalmente lo termina un proxy inverso (Caddy/Nginx),
// así que el gateway puede operar en HTTP internamente sin certificados propios.
if ((CERT_PATH || KEY_PATH) && !certsAvailable) {
    logger.error('SSL_CERT_PATH/SSL_KEY_PATH configurados pero los archivos no existen');
    process.exit(1);
}

if (certsAvailable) {
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
    if (isProduction) {
        logger.warn('API Gateway en HTTP (el TLS lo termina Caddy/Nginx en el proxy)');
    }
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
