// Rutas del servicio de reservas.
// Define endpoints para gestionar el ciclo de vida completo de las reservas.
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validateToken, requireRole, success, errorHandler } = require('shared');

// Crear una nueva solicitud de reserva
router.post('/', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingController.create(req.body, req.user.id);
        success(res, booking, 201);
    } catch (err) { next(err); }
});

// Verificar disponibilidad de una maquinaria en un rango de fechas
router.get('/check-availability', async (req, res, next) => {
    try {
        const result = await bookingController.checkAvailability(
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
        const result = await bookingController.getByUser(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
});

// Admin: estadisticas de reservas (solo admin)
router.get('/stats', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const stats = await bookingController.adminBookingStats();
        success(res, stats);
    } catch (err) { next(err); }
});

// Admin: reservas recientes (solo admin)
router.get('/recent', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const bookings = await bookingController.adminRecentBookings(limit);
        success(res, bookings);
    } catch (err) { next(err); }
});

// Listar reservas donde el usuario autenticado es propietario
router.get('/my-listings', validateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await bookingController.getByOwner(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
});

// Obtener detalle de una reserva por ID
router.get('/:id', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingController.getById(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Confirmar una reserva (solo el propietario)
router.put('/:id/confirm', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingController.confirm(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Rechazar una reserva (solo el propietario)
router.put('/:id/reject', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingController.reject(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

// Cancelar una reserva (cualquier parte involucrada)
router.put('/:id/cancel', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingController.cancel(req.params.id, req.user.id, req.body.motivo);
        success(res, booking);
    } catch (err) { next(err); }
});

// Completar una reserva (solo el propietario)
router.put('/:id/complete', validateToken, async (req, res, next) => {
    try {
        const booking = await bookingController.complete(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
