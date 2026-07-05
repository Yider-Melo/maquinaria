// Rutas del servicio de reservas.
// Define endpoints para gestionar el ciclo de vida completo de las reservas.
const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { validate, validateToken, requireRole, schemas, success, errorHandler, ForbiddenError } = require('shared');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev';

function internalAuth(req, res, next) {
    if (req.headers['x-api-key'] !== INTERNAL_API_KEY) {
        return next(new ForbiddenError('API key inválida'));
    }
    next();
}

// Crear una nueva solicitud de reserva
router.post('/', validateToken, validate(schemas.reserva), async (req, res, next) => {
    try {
        const booking = await bookingService.create(req.body, req.user.id);
        success(res, booking, 201);
    } catch (err) { next(err); }
});

// Verificar disponibilidad de una maquinaria en un rango de fechas
router.get('/check-availability', async (req, res, next) => {
    try {
        const result = await bookingService.checkAvailability(
            req.query.machineryId, req.query.start, req.query.end
        );
        success(res, result);
    } catch (err) { next(err); }
});

// Listar reservas del usuario autenticado como arrendatario
router.get('/my-bookings', validateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await bookingService.getByUser(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
});

// Admin: estadisticas de reservas (solo admin)
router.get('/stats', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const stats = await bookingService.adminBookingStats();
        success(res, stats);
    } catch (err) { next(err); }
});

// Admin: reservas recientes (solo admin)
router.get('/recent', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const bookings = await bookingService.adminRecentBookings(limit);
        success(res, bookings);
    } catch (err) { next(err); }
});

router.get('/machinery/:machineryId/occupied', async (req, res, next) => {
    try {
        const result = await bookingService.getOccupiedDates(req.params.machineryId, req.query.start, req.query.end);
        success(res, result);
    } catch (err) { next(err); }
});

router.get('/internal/:id', internalAuth, async (req, res, next) => {
    try {
        const booking = await bookingService.getInternalById(req.params.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Listar reservas donde el usuario autenticado es propietario
router.get('/my-listings', validateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await bookingService.getByOwner(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
});

// Obtener detalle de una reserva por ID
router.get('/:id', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingService.getById(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Confirmar una reserva (solo el propietario)
router.put('/:id/confirm', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingService.confirm(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Rechazar una reserva (solo el propietario)
router.put('/:id/reject', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingService.reject(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Cancelar una reserva (cualquier parte involucrada)
router.put('/:id/cancel', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingService.cancel(req.params.id, req.user.id, req.body.motivo);
        success(res, booking);
    } catch (err) { next(err); }
});

// Completar una reserva (solo el propietario)
router.put('/:id/complete', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingService.complete(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
