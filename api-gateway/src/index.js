// Punto de entrada del API Gateway.
// Unifica el acceso a todos los microservicios, implementa WebSocket para
// notificaciones en tiempo real, rate limiting y enrutamiento por proxy.
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const routes = require('./routes');
const { authLimiter, userLimiter } = require('./middleware/rateLimiter');
const logger = require('./config/logger');
const httpLogger = require('./middleware/httpLogger');
const { cors, securityHeaders } = require('./config/security');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: process.env.NODE_ENV === 'development' ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST'] 
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rentamaq-secret-key-dev';

// CORS debe ir ANTES que cualquier otro middleware, incluyendo Helmet
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    const shouldAllowOrigin = !origin || isDevelopment || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');

    if (shouldAllowOrigin && origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(cors);
app.options('*', cors);

// Security headers (después de CORS para no interferir con preflight)
app.use(securityHeaders);

// Logging y parseo
app.use(httpLogger);
// No usar body parsers globales aquí porque http-proxy-middleware necesita
// el stream original del request para reenviar correctamente las peticiones
// a los microservicios. El parsing se aplica solo a rutas locales que no pasan por proxy.

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    logger.info('Health check request');
    res.json({ success: true, service: 'api-gateway', status: 'running' });
});

// Endpoint interno para que el notification-service envie notificaciones
// en tiempo real via WebSocket al usuario correspondiente
app.post('/_ws/notify', express.json({ limit: '50mb' }), (req, res) => {
    const { userId, titulo, mensaje } = req.body;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'userId requerido' });
    }
    io.to(`user:${userId}`).emit('notification', { titulo, mensaje });
    logger.info('Notification sent', { userId, titulo });
    res.json({ success: true });
});

// Rate limiting aplicado a auth y otras rutas
app.use('/auth', authLimiter);
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
        socket.user = jwt.verify(token, JWT_SECRET);
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

// Manejo de errores global
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });
    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
        }
    });
});

server.listen(PORT, () => {
    logger.info(`API Gateway iniciado`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        corsEnabled: true,
        securityHeadersEnabled: true
    });
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando servidor');
    server.close(() => {
        logger.info('API Gateway cerrado');
        process.exit(0);
    });
});

module.exports = app;
