// Rutas del servicio de maquinaria.
// Define los endpoints CRUD para maquinaria, imagenes y disponibilidad.
const express = require('express');
const router = express.Router();
const machineryController = require('../controllers/machineryController');
const { validate, validateToken, schemas, success, errorHandler } = require('shared');

// Crear una nueva maquinaria (solo propietarios autenticados)
router.post('/', validateToken, validate(schemas.maquinaria), async (req, res, next) => {
    try {
        const machinery = await machineryController.create(req.body, req.user.id);
        success(res, machinery, 201);
    } catch (err) { next(err); }
});

// Listar maquinaria del propietario autenticado, paginada
router.get('/owner', validateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await machineryController.getByOwner(req.user.id, page, size);
        success(res, result);
    } catch (err) { next(err); }
});

// Obtener maquinaria por ID, incluyendo sus imagenes
router.get('/:id', async (req, res, next) => {
    try {
        const machinery = await machineryController.getById(req.params.id);
        const images = await machineryController.getImages(req.params.id);
        success(res, { ...machinery, imagenes: images });
    } catch (err) { next(err); }
});

// Actualizar datos de una maquinaria (solo su propietario)
router.put('/:id', validateToken, async (req, res, next) => {
    try {
        const machinery = await machineryController.update(req.params.id, req.body, req.user.id);
        success(res, machinery);
    } catch (err) { next(err); }
});

// Eliminar (soft-delete) una maquinaria (solo su propietario)
router.delete('/:id', validateToken, async (req, res, next) => {
    try {
        const result = await machineryController.remove(req.params.id, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Agregar imagen a una maquinaria
router.post('/:id/images', validateToken, async (req, res, next) => {
    try {
        const image = await machineryController.addImage(req.params.id, req.body.url, req.user.id);
        success(res, image, 201);
    } catch (err) { next(err); }
});

// Obtener todas las imagenes de una maquinaria
router.get('/:id/images', async (req, res, next) => {
    try {
        const images = await machineryController.getImages(req.params.id);
        success(res, images);
    } catch (err) { next(err); }
});

// Eliminar una imagen especifica de una maquinaria
router.delete('/:id/images/:imageId', validateToken, async (req, res, next) => {
    try {
        const result = await machineryController.deleteImage(req.params.id, req.params.imageId, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Actualizar disponibilidad por fechas de una maquinaria
router.put('/:id/availability', validateToken, async (req, res, next) => {
    try {
        const result = await machineryController.updateAvailability(req.params.id, req.body.fechas, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
});

// Consultar disponibilidad de una maquinaria en un rango de fechas
router.get('/:id/availability', async (req, res, next) => {
    try {
        const availability = await machineryController.getAvailability(
            req.params.id, req.query.start, req.query.end
        );
        success(res, availability);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
