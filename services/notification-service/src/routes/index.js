// Rutas del servicio de notificaciones.
// Define endpoints para consultar, marcar como leidas y crear notificaciones
// via API interna entre servicios.
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { validateToken, success, errorHandler, ForbiddenError, getInternalApiKey } = require('shared');

// Importar helpers de tiempo real para emitir socket también en modo fallback HTTP
const { notifyGatewayViaHttp, broadcastRefreshViaHttp } = notificationService;

const INTERNAL_API_KEY = getInternalApiKey();

// Middleware de autenticacion interna entre microservicios via API key
function internalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) {
        return next(new ForbiddenError('API key inválida'));
    }
    next();
}

// Obtener notificaciones del usuario autenticado, paginadas
router.get('/unread-count', validateToken, async (req, res, next) => {
    try {
        const result = await notificationService.getUnreadCount(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

router.get('/', validateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await notificationService.getNotificationsByUser(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
});

// Marcar una notificacion como leida
router.put('/:id/read', validateToken, async (req, res, next) => {
    try {
        const result = await notificationService.markAsRead(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Marcar todas las notificaciones del usuario como leidas
router.put('/read-all', validateToken, async (req, res, next) => {
    try {
        const result = await notificationService.markAllAsRead(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Crear notificacion via API interna (entre microservicios, con API key)
router.post('/internal', internalAuth, async (req, res, next) => {
    try {
        const result = await notificationService.createNotificationDirect(
            req.body.usuario_id,
            req.body.tipo,
            req.body.titulo,
            req.body.mensaje,
            req.body.referencia_id,
            req.body.referencia_tipo
        );
        notifyGatewayViaHttp(
            req.body.usuario_id,
            req.body.tipo,
            req.body.titulo,
            req.body.mensaje,
            req.body.referencia_id,
            req.body.referencia_tipo
        );
        broadcastRefreshViaHttp(req.body.tipo, req.body.referencia_id, req.body.referencia_tipo);
        success(res, result, 201);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
