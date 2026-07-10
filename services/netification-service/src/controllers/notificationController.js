const notificationService = require('../services/notificationService');
const { success } = require('shared');

async function getUnreadCount(req, res, next) {
    try {
        const result = await notificationService.getUnreadCount(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function getNotifications(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await notificationService.getNotificationsByUser(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
}

async function markAsRead(req, res, next) {
    try {
        const result = await notificationService.markAsRead(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function markAllAsRead(req, res, next) {
    try {
        const result = await notificationService.markAllAsRead(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function createInternal(req, res, next) {
    try {
        const result = await notificationService.createNotificationDirect(
            req.body.usuario_id,
            req.body.tipo,
            req.body.titulo,
            req.body.mensaje,
            req.body.referencia_id,
            req.body.referencia_tipo
        );
        success(res, result, 201);
    } catch (err) { next(err); }
}

module.exports = {
    getUnreadCount,
    getNotifications,
    markAsRead,
    markAllAsRead,
    createInternal,
};
