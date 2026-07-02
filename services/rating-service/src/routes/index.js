// Rutas del servicio de calificaciones.
// Define endpoints para crear, consultar, actualizar, eliminar y reportar
// calificaciones de usuarios y maquinaria.
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { validateToken, requireRole, success, errorHandler } = require('shared');

// Crear una nueva calificacion
router.post('/', validateToken, async (req, res, next) => {
    try {
        const rating = await ratingController.create(req.body, req.user.id);
        success(res, rating, 201);
    } catch (err) { next(err); }
});

// Obtener calificaciones recibidas por un usuario
router.get('/user/:userId', async (req, res, next) => {
    try {
        const ratings = await ratingController.getByUser(req.params.userId);
        success(res, ratings);
    } catch (err) { next(err); }
});

// Obtener promedio de calificacion de un usuario
router.get('/user/:userId/average', async (req, res, next) => {
    try {
        const average = await ratingController.getAverage(req.params.userId);
        success(res, average);
    } catch (err) { next(err); }
});

// Admin: estadisticas de calificaciones (solo admin)
router.get('/stats', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const stats = await ratingController.adminRatingStats();
        success(res, stats);
    } catch (err) { next(err); }
});

// Obtener calificaciones de una maquinaria
router.get('/machinery/:machineryId', async (req, res, next) => {
    try {
        const ratings = await ratingController.getByMachinery(req.params.machineryId);
        success(res, ratings);
    } catch (err) { next(err); }
});

// Actualizar una calificacion existente (solo el autor)
router.put('/:id', validateToken, async (req, res, next) => {
    try {
        const rating = await ratingController.update(req.params.id, req.body, req.user.id);
        success(res, rating);
    } catch (err) { next(err); }
});

// Eliminar (soft-delete) una calificacion (solo el autor)
router.delete('/:id', validateToken, async (req, res, next) => {
    try {
        const result = await ratingController.remove(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Reportar una calificacion como inapropiada
router.post('/:id/report', validateToken, async (req, res, next) => {
    try {
        const rating = await ratingController.report(req.params.id, req.user.id, req.body.motivo);
        success(res, rating);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
