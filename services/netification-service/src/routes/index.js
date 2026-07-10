const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { validateToken, errorHandler, ForbiddenError } = require('shared');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev';

function internalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== INTERNAL_API_KEY) {
        return next(new ForbiddenError('API key inválida'));
    }
    next();
}

router.get('/unread-count', validateToken, notificationController.getUnreadCount);
router.get('/', validateToken, notificationController.getNotifications);
router.put('/:id/read', validateToken, notificationController.markAsRead);
router.put('/read-all', validateToken, notificationController.markAllAsRead);
router.post('/internal', internalAuth, notificationController.createInternal);

router.use(errorHandler);

module.exports = router;
