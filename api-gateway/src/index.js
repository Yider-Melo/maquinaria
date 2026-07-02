// Punto de entrada del API Gateway.
// Unifica el acceso a todos los microservicios, implementa WebSocket para
// notificaciones en tiempo real, rate limiting y enrutamiento por proxy.
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const routes = require('./routes');
const { authLimiter, userLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rentamaq-secret-key-dev';

app.use(cors());
app.use(morgan('dev'));
// No usar express.json() globalmente porque http-proxy-middleware
// necesita el body crudo (stream) para reenviarlo a los microservicios.
// Solo se aplica a rutas específicas que no pasan por proxy.

// Endpoint de salud para el balanceador / healthcheck
app.get('/health', (_req, res) => {
    res.json({ success: true, service: 'api-gateway', status: 'running' });
});

// Endpoint interno para que el notification-service envie notificaciones
// en tiempo real via WebSocket al usuario correspondiente
app.post('/_ws/notify', express.json({ limit: '50mb' }), (req, res) => {
    const { userId, titulo, mensaje } = req.body;
    if (userId) {
        io.to(`user:${userId}`).emit('notification', { titulo, mensaje });
    }
    res.json({ success: true });
});

app.use('/auth', authLimiter);
app.use('/', routes);

// Middleware de autenticacion para WebSocket: verifica el token JWT al conectar
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
        socket.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        next(new Error('Token inválido'));
    }
});

// Gestion de conexiones WebSocket: el usuario se une a una sala privada
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.user?.id}`);
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.user?.id}`);
    });
});

app.set('io', io);

server.listen(PORT, () => {
    console.log(`API Gateway corriendo en puerto ${PORT}`);
});
