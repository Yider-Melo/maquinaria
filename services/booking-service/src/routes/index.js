const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validate, validateToken, requireRole, schemas, errorHandler, ForbiddenError } = require('shared');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev';

function internalAuth(req, res, next) {
    if (req.headers['x-api-key'] !== INTERNAL_API_KEY) {
        return next(new ForbiddenError('API key inválida'));
    }
    next();
}

router.post('/', validateToken, validate(schemas.reserva), bookingController.create);
router.get('/check-availability', bookingController.checkAvailability);
router.get('/my-bookings', validateToken, bookingController.getMyBookings);
router.get('/stats', validateToken, requireRole('admin'), bookingController.adminBookingStats);
router.get('/recent', validateToken, requireRole('admin'), bookingController.adminRecentBookings);
router.get('/machinery/:machineryId/occupied', bookingController.getOccupiedDates);
router.get('/internal/:id', internalAuth, bookingController.getInternalById);
router.get('/my-listings', validateToken, bookingController.getMyListings);
router.get('/:id', validateToken, bookingController.getById);
router.put('/:id/confirm', validateToken, bookingController.confirm);
router.put('/:id/reject', validateToken, bookingController.reject);
router.put('/:id/cancel', validateToken, bookingController.cancel);
router.put('/:id/complete', validateToken, bookingController.complete);

router.use(errorHandler);

module.exports = router;
