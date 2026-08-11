const paymentService = require('../services/paymentService');
const { success } = require('shared');

async function releaseByBooking(req, res, next) {
    try {
        const result = await paymentService.releaseByBooking(req.params.bookingId);
        success(res, result);
    } catch (err) { next(err); }
}

async function getDashboard(req, res, next) {
    try {
        const q = (req.query.q || '').trim();
        const dashboard = await paymentService.getDashboard(q);
        success(res, dashboard);
    } catch (err) { next(err); }
}

async function getPaymentsByMonth(req, res, next) {
    try {
        const mes = req.query.mes;
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 10;
        const result = await paymentService.getPaymentsByMonth(mes, page, size);
        const { paginated } = require('shared');
        paginated(res, result.data, result.total, page, size);
    } catch (err) { next(err); }
}

async function createCheckout(req, res, next) {
    try {
        const checkout = await paymentService.createCheckout(req.body.reserva_id, req.user.id, req.body.metodo_pago);
        success(res, checkout);
    } catch (err) { next(err); }
}

async function handleWebhook(req, res, next) {
    try {
        const result = await paymentService.handleWebhook(req.body);
        success(res, result);
    } catch (err) { next(err); }
}

async function getPaymentsByBooking(req, res, next) {
    try {
        const payments = await paymentService.getPaymentsByBooking(req.params.bookingId, req.user.id);
        success(res, payments);
    } catch (err) { next(err); }
}

async function getMyPayments(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await paymentService.getMyPayments(req.user.id, page, size);
        const { paginated } = require('shared');
        paginated(res, result.data, result.total, page, size);
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
        const result = await paymentService.releaseFunds(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function refund(req, res, next) {
    try {
        const result = await paymentService.refund(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function refundByBookingInternal(req, res, next) {
    try {
        const result = await paymentService.refundByBooking(req.params.bookingId);
        success(res, result);
    } catch (err) { next(err); }
}

async function retryPayout(req, res, next) {
    try {
        const result = await paymentService.retryPayout(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function getPendingPayouts(req, res, next) {
    try {
        const result = await paymentService.getPendingPayouts();
        success(res, result);
    } catch (err) { next(err); }
}

async function getFailedPayouts(req, res, next) {
    try {
        const result = await paymentService.getFailedPayouts();
        success(res, result);
    } catch (err) { next(err); }
}

async function markPayoutCompleted(req, res, next) {
    try {
        const result = await paymentService.markPayoutManuallyCompleted(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

module.exports = {
    getDashboard,
    getPaymentsByMonth,
    createCheckout,
    handleWebhook,
    getPaymentsByBooking,
    getMyPayments,
    getPaymentById,
    simulateApproval,
    releaseFunds,
    refund,
    refundByBookingInternal,
    releaseByBooking,
    retryPayout,
    getPendingPayouts,
    getFailedPayouts,
    markPayoutCompleted,
};
