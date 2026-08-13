const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validate, validateParams, uuidParam, validateToken, requireRole, errorHandler, schemas } = require('shared');

router.get('/dashboard', validateToken, requireRole('admin'), paymentController.getDashboard);
router.get('/by-month', validateToken, requireRole('admin'), paymentController.getPaymentsByMonth);
router.get('/failed', validateToken, requireRole('admin'), paymentController.getFailedPayments);
router.get('/admin/payouts/pending', validateToken, requireRole('admin'), paymentController.getPendingPayouts);
router.get('/admin/payouts/failed', validateToken, requireRole('admin'), paymentController.getFailedPayouts);
router.post('/admin/payouts/:id/retry', validateToken, requireRole('admin'), validateParams(uuidParam('id')), paymentController.retryPayout);
router.post('/admin/payouts/:id/mark-completed', validateToken, requireRole('admin'), validateParams(uuidParam('id')), paymentController.markPayoutCompleted);
router.post('/checkout', validateToken, validate(schemas.pago), paymentController.createCheckout);
function internalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== (process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev')) {
        return res.status(403).json({ success: false, error: { message: 'API key inválida' } });
    }
    next();
}
function webhookAuth(req, res, next) {
    const provider = (process.env.PAYMENT_PROVIDER || 'mercadopago').toLowerCase();
    if (provider === 'wompi') {
        return next();
    }
    const signature = req.headers['x-signature'];
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({ success: false, error: { message: 'Webhook secret no configurado' } });
        }
        return next();
    }
    if (!signature) {
        return res.status(403).json({ success: false, error: { message: 'Firma no proporcionada' } });
    }

    const parts = signature.split(',');
    let ts = '', v1 = '';
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const key = part.slice(0, idx);
        const value = part.slice(idx + 1);
        if (key === 'ts') ts = value;
        else if (key === 'v1') v1 = value;
    }

    if (!ts || !v1) {
        return res.status(403).json({ success: false, error: { message: 'Formato de firma inválido' } });
    }

    const dataId = req.body && req.body.data && req.body.data.id;
    if (!dataId) {
        return res.status(400).json({ success: false, error: { message: 'ID de datos no encontrado en el body' } });
    }

    const manifest = String(dataId) + '||' + ts;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(manifest)
        .digest('hex');

    if (v1 !== expected) {
        return res.status(403).json({ success: false, error: { message: 'Firma inválida' } });
    }

    next();
}
router.post('/webhook', webhookAuth, paymentController.handleWebhook);
router.post('/internal/booking/:bookingId/release', internalAuth, validateParams(uuidParam('bookingId')), paymentController.releaseByBooking);
router.post('/internal/booking/:bookingId/refund', internalAuth, validateParams(uuidParam('bookingId')), paymentController.refundByBookingInternal);
router.get('/my-payments', validateToken, paymentController.getMyPayments);
router.get('/booking/:bookingId', validateToken, validateParams(uuidParam('bookingId')), paymentController.getPaymentsByBooking);
router.get('/:id', validateToken, validateParams(uuidParam('id')), paymentController.getPaymentById);
router.post('/:id/simulate-approval', validateToken, validateParams(uuidParam('id')), paymentController.simulateApproval);
router.post('/:id/release', validateToken, requireRole('admin', 'propietario'), validateParams(uuidParam('id')), paymentController.releaseFunds);
router.post('/:id/refund', validateToken, requireRole('admin'), validateParams(uuidParam('id')), paymentController.refund);

router.use(errorHandler);

module.exports = router;
