const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validateToken, requireRole, errorHandler } = require('shared');

router.get('/admin/dashboard', validateToken, requireRole('admin'), paymentController.getDashboard);
router.post('/checkout', validateToken, paymentController.createCheckout);
router.post('/webhook', paymentController.handleWebhook);
router.get('/booking/:bookingId', validateToken, paymentController.getPaymentsByBooking);
router.get('/:id', validateToken, paymentController.getPaymentById);
router.post('/:id/simulate-approval', validateToken, paymentController.simulateApproval);
router.post('/:id/release', validateToken, paymentController.releaseFunds);
router.post('/:id/refund', validateToken, paymentController.refund);

router.use(errorHandler);

module.exports = router;
