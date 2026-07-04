// Rutas del servicio de pagos.
// Define endpoints para checkout, webhooks de pasarela, consulta de pagos,
// liberacion de fondos, reembolsos y dashboard administrativo.
const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { validateToken, requireRole, success, errorHandler } = require('shared');

// Dashboard administrativo con resumen de transacciones (solo admin)
router.get('/admin/dashboard', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const dashboard = await paymentService.getDashboard();
        success(res, dashboard);
    } catch (err) { next(err); }
});

// Iniciar proceso de pago para una reserva confirmada
router.post('/checkout', validateToken, async (req, res, next) => {
    try {
        const checkout = await paymentService.createCheckout(req.body.reserva_id, req.user.id, req.body.metodo_pago);
        success(res, checkout);
    } catch (err) { next(err); }
});

// Webhook para recibir notificaciones de la pasarela de pagos
router.post('/webhook', async (req, res) => {
    try {
        const result = await paymentService.handleWebhook(req.body);
        success(res, result);
    } catch (err) {
        console.error('Error procesando webhook:', err);
        res.status(500).json({ success: false, error: { message: 'Error procesando webhook' } });
    }
});

// Obtener pagos asociados a una reserva
router.get('/booking/:bookingId', validateToken, async (req, res, next) => {
    try {
        const payments = await paymentService.getPaymentsByBooking(req.params.bookingId, req.user.id);
        success(res, payments);
    } catch (err) { next(err); }
});

// Obtener detalle de un pago por ID
router.get('/:id', validateToken, async (req, res, next) => {
    try {
        const payment = await paymentService.getPaymentById(req.params.id, req.user.id);
        success(res, payment);
    } catch (err) { next(err); }
});

// Liberar fondos retenidos al propietario
router.post('/:id/release', validateToken, async (req, res, next) => {
    try {
        const result = await paymentService.releaseFunds(req.params.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Reembolsar un pago retenido
router.post('/:id/refund', validateToken, async (req, res, next) => {
    try {
        const result = await paymentService.refund(req.params.id);
        success(res, result);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
