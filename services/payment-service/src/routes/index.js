const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validate, validateParams, uuidParam, validateToken, requireRole, errorHandler, schemas } = require('shared');

router.get('/admin/dashboard', validateToken, requireRole('admin'), paymentController.getDashboard);
router.post('/checkout', validateToken, validate(schemas.pago), paymentController.createCheckout);
function webhookAuth(req, res, next) {
    const signature = req.headers['x-webhook-signature'];
    const allowedIps = (process.env.WEBHOOK_ALLOWED_IPS || '').split(',');
    if (allowedIps.length > 0 && allowedIps[0] !== '' && !allowedIps.includes(req.ip)) {
        return res.status(403).json({ success: false, error: { message: 'Acceso denegado' } });
    }
    next();
}
router.post('/webhook', webhookAuth, paymentController.handleWebhook);
function internalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== (process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev')) {
        return res.status(403).json({ success: false, error: { message: 'API key inválida' } });
    }
    next();
}
router.get('/booking/:bookingId', internalAuth, validateParams(uuidParam('bookingId')), paymentController.getPaymentsByBooking);
router.get('/:id', validateToken, validateParams(uuidParam('id')), paymentController.getPaymentById);
router.post('/:id/simulate-approval', validateToken, validateParams(uuidParam('id')), paymentController.simulateApproval);
router.post('/:id/release', validateToken, requireRole('admin', 'propietario'), validateParams(uuidParam('id')), paymentController.releaseFunds);
router.post('/:id/refund', validateToken, requireRole('admin'), validateParams(uuidParam('id')), paymentController.refund);

router.use(errorHandler);

module.exports = router;
