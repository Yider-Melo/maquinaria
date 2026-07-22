const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validate, validateParams, validateQuery, uuidParam, validateToken, requireRole, schemas, errorHandler, ForbiddenError } = require('shared');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || (console.warn('⚠️ INTERNAL_API_KEY no configurada en booking-service. Usando clave por defecto (inseguro).'), 'rentamaq-internal-key-dev');

function internalAuth(req, res, next) {
    if (req.headers['x-api-key'] !== INTERNAL_API_KEY) {
        return next(new ForbiddenError('API key inválida'));
    }
    next();
}

router.post('/', validateToken, validate(schemas.reserva), bookingController.create);
router.get('/check-availability', validateQuery(schemas.checkAvailability), bookingController.checkAvailability);
router.get('/my-bookings', validateToken, bookingController.getMyBookings);
router.get('/stats', validateToken, requireRole('admin'), bookingController.adminBookingStats);
router.get('/recent', validateToken, requireRole('admin'), bookingController.adminRecentBookings);
router.get('/machinery/:machineryId/occupied', validateParams(uuidParam('machineryId')), bookingController.getOccupiedDates);
router.get('/internal/:id', internalAuth, validateParams(uuidParam('id')), bookingController.getInternalById);
router.post('/internal/:id/mark-paid', internalAuth, validateParams(uuidParam('id')), bookingController.markAsPaid);
router.get('/my-listings', validateToken, bookingController.getMyListings);
router.get('/:id', validateToken, validateParams(uuidParam('id')), bookingController.getById);
router.post('/:id/confirm', validateToken, validateParams(uuidParam('id')), bookingController.confirm);
router.post('/:id/reject', validateToken, validateParams(uuidParam('id')), bookingController.reject);
router.post('/:id/cancel', validateToken, validateParams(uuidParam('id')), validate(schemas.cancelBooking), bookingController.cancel);
router.post('/:id/complete', validateToken, validateParams(uuidParam('id')), bookingController.complete);

router.use(errorHandler);

module.exports = router;
