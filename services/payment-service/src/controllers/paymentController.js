const paymentService = require('../services/paymentService');
const { success } = require('shared');

async function getDashboard(req, res, next) {
    try {
        const dashboard = await paymentService.getDashboard();
        success(res, dashboard);
    } catch (err) { next(err); }
}

async function createCheckout(req, res, next) {
    try {
        const checkout = await paymentService.createCheckout(req.body.reserva_id, req.user.id, req.body.metodo_pago);
        success(res, checkout);
    } catch (err) { next(err); }
}

async function handleWebhook(req, res) {
    try {
        const result = await paymentService.handleWebhook(req.body);
        success(res, result);
    } catch (err) {
        console.error('Error procesando webhook:', err);
        res.status(500).json({ success: false, error: { message: 'Error procesando webhook' } });
    }
}

async function getPaymentsByBooking(req, res, next) {
    try {
        const payments = await paymentService.getPaymentsByBooking(req.params.bookingId, req.user.id);
        success(res, payments);
    } catch (err) { next(err); }
}

async function getPaymentById(req, res, next) {
    try {
        const payment = await paymentService.getPaymentById(req.params.id, req.user.id);
        success(res, payment);
    } catch (err) { next(err); }
}

async function simulateApproval(req, res, next) {
    try {
        const result = await paymentService.simulateApproval(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function releaseFunds(req, res, next) {
    try {
        const result = await paymentService.releaseFunds(req.params.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function refund(req, res, next) {
    try {
        const result = await paymentService.refund(req.params.id);
        success(res, result);
    } catch (err) { next(err); }
}

module.exports = {
    getDashboard,
    createCheckout,
    handleWebhook,
    getPaymentsByBooking,
    getPaymentById,
    simulateApproval,
    releaseFunds,
    refund,
};
