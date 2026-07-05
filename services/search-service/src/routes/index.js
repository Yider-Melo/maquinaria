// Rutas del servicio de busqueda.
// Define endpoints de busqueda, sugerencias, cercania e indexacion manual.
const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const { validateQuery, validateToken, success, errorHandler, schemas } = require('shared');

// Busqueda principal con filtros (texto, tipo, precio, ubicacion, etc.)
router.get('/', validateQuery(schemas.busqueda), async (req, res, next) => {
    try {
        const result = await searchService.search(req.query);
        success(res, result);
    } catch (err) { next(err); }
});

// Sugerencias de autocompletado para el campo de busqueda
router.get('/suggestions', async (req, res, next) => {
    try {
        const suggestions = await searchService.getSuggestions(req.query.q || '');
        success(res, suggestions);
    } catch (err) { next(err); }
});

// Busqueda por cercania geografica (latitud, longitud, radio en km)
router.get('/nearby', async (req, res, next) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseInt(req.query.radius) || 50;
        const result = await searchService.getNearby(lat, lng, radius);
        success(res, result);
    } catch (err) { next(err); }
});

// Indexar (insertar/actualizar) maquinaria manualmente en el indice
router.post('/index', validateToken, async (req, res, next) => {
    try {
        await searchService.indexMachinery(req.body);
        success(res, { message: 'Indexado correctamente' });
    } catch (err) { next(err); }
});

// Eliminar maquinaria del indice (soft-delete)
router.delete('/index/:id', validateToken, async (req, res, next) => {
    try {
        await searchService.removeFromIndex(req.params.id);
        success(res, { message: 'Eliminado del índice' });
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
