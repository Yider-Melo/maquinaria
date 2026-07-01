// Rutas del API Gateway.
// Redirige las peticiones a los microservicios correspondientes mediante proxy,
// aplicando autenticacion y control de roles segun el endpoint.
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { validateToken, requireRole, extractUser } = require('../middleware/authMiddleware');

const router = express.Router();

// URLs de los microservicios backend (configurables por entorno)
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const MACHINERY_SERVICE = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';
const SEARCH_SERVICE = process.env.SEARCH_SERVICE_URL || 'http://localhost:3003';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const RATING_SERVICE = process.env.RATING_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

// Factory para crear proxies con rewrite de ruta
const proxyWithTarget = (target, pathRewrite) => createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite
});

// Autenticacion (sin token, publico)
router.use('/auth', proxyWithTarget(AUTH_SERVICE, { '^/auth': '' }));

// Maquinaria: rutas publicas solo lectura, rutas de escritura requieren token
router.get('/machinery', proxyWithTarget(MACHINERY_SERVICE, { '^/machinery': '' }));
router.get('/machinery/*', proxyWithTarget(MACHINERY_SERVICE, { '^/machinery': '' }));
router.use('/machinery', validateToken, proxyWithTarget(MACHINERY_SERVICE, { '^/machinery': '' }));

// Busqueda (publico, no requiere token)
router.use('/search', proxyWithTarget(SEARCH_SERVICE, { '^/search': '' }));

// Reservas (requiere autenticacion)
router.use('/bookings', validateToken, proxyWithTarget(BOOKING_SERVICE, { '^/bookings': '' }));

// Pagos (requiere autenticacion)
router.use('/payments', validateToken, proxyWithTarget(PAYMENT_SERVICE, { '^/payments': '' }));

// Calificaciones: rutas publicas solo lectura
router.get('/ratings', proxyWithTarget(RATING_SERVICE, { '^/ratings': '' }));
router.get('/ratings/*', proxyWithTarget(RATING_SERVICE, { '^/ratings': '' }));
router.use('/ratings', validateToken, proxyWithTarget(RATING_SERVICE, { '^/ratings': '' }));

// Notificaciones (requiere autenticacion)
router.use('/notifications', validateToken, proxyWithTarget(NOTIFICATION_SERVICE, { '^/notifications': '' }));

// Admin (requiere autenticacion + rol admin)
const adminProxy = createProxyMiddleware({
    target: MACHINERY_SERVICE,
    changeOrigin: true,
    pathRewrite: { '^/admin': '/admin' }
});
router.use('/admin', validateToken, requireRole('admin'), adminProxy);

module.exports = router;
