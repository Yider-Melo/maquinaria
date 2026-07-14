const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validate, validateParams, uuidParam, validateToken, requireRole, errorHandler, schemas } = require('shared');

router.get('/admin/dashboard', validateToken, requireRole('admin'), paymentController.getDashboard);
router.post('/checkout', validateToken, validate(schemas.pago), paymentController.createCheckout);
router.post('/webhook', paymentController.handleWebhook);
router.get('/booking/:bookingId', validateToken, validateParams(uuidParam('bookingId')), paymentController.getPaymentsByBooking);
router.get('/:id', validateToken, validateParams(uuidParam('id')), paymentController.getPaymentById);
router.post('/:id/simulate-approval', validateToken, validateParams(uuidParam('id')), paymentController.simulateApproval);
router.post('/:id/release', validateToken, requireRole('admin', 'propietario'), validateParams(uuidParam('id')), paymentController.releaseFunds);
router.post('/:id/refund', validateToken, requireRole('admin'), validateParams(uuidParam('id')), paymentController.refund);

router.use(errorHandler);

module.exports = router;
