const machineryService = require('../services/machineryService');
const { success, paginated } = require('shared');

async function create(req, res, next) {
    try {
        const machinery = await machineryService.create(req.body, req.user.id);
        success(res, machinery, 201);
    } catch (err) { next(err); }
}

async function listActive(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await machineryService.listActive(page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function getByOwner(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await machineryService.getByOwner(req.user.id, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function adminMachineryStats(req, res, next) {
    try {
        const stats = await machineryService.adminMachineryStats();
        success(res, stats);
    } catch (err) { next(err); }
}

async function adminAllMachinery(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const q = (req.query.q || '').trim();
        const { data, total } = await machineryService.adminAllMachinery(page, size, q);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function adminSetMachineryStatus(req, res, next) {
    try {
        const result = await machineryService.adminSetMachineryStatus(req.params.id, req.body.activo === true);
        success(res, result);
    } catch (err) { next(err); }
}

async function getById(req, res, next) {
    try {
        const machinery = await machineryService.getById(req.params.id);
        const images = await machineryService.getImages(req.params.id);
        success(res, { ...machinery, imagenes: images });
    } catch (err) { next(err); }
}

async function update(req, res, next) {
    try {
        const machinery = await machineryService.update(req.params.id, req.body, req.user.id);
        success(res, machinery);
    } catch (err) { next(err); }
}

async function remove(req, res, next) {
    try {
        await machineryService.remove(req.params.id, req.user.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

async function addImage(req, res, next) {
    try {
        const image = await machineryService.addImage(req.params.id, req.body.url, req.user.id);
        success(res, image, 201);
    } catch (err) { next(err); }
}

async function getImages(req, res, next) {
    try {
        const images = await machineryService.getImages(req.params.id);
        success(res, images);
    } catch (err) { next(err); }
}

async function getCovers(req, res, next) {
    try {
        const ids = (req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
        const covers = await machineryService.getCovers(ids);
        success(res, covers);
    } catch (err) { next(err); }
}

async function deleteImage(req, res, next) {
    try {
        await machineryService.deleteImage(req.params.id, req.params.imageId, req.user.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

async function updateAvailability(req, res, next) {
    try {
        const result = await machineryService.updateAvailability(req.params.id, req.body.fechas, req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function getAvailability(req, res, next) {
    try {
        const availability = await machineryService.getAvailability(req.params.id, req.query.start, req.query.end);
        success(res, availability);
    } catch (err) { next(err); }
}

async function internalSetDisponible(req, res, next) {
    try {
        const result = await machineryService.setDisponible(req.params.id, req.body.disponible === true);
        success(res, result);
    } catch (err) { next(err); }
}

async function internalUpdateRating(req, res, next) {
    try {
        const result = await machineryService.updateRating(req.params.id, req.body.puntuacion_promedio, req.body.total_resenas);
        success(res, result);
    } catch (err) { next(err); }
}

async function toggleFavorite(req, res, next) {
    try {
        const result = await machineryService.toggleFavorite(req.user.id, req.params.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function getFavorites(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await machineryService.getFavorites(req.user.id, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function checkFavorite(req, res, next) {
    try {
        const result = await machineryService.checkFavorite(req.user.id, req.params.id);
        success(res, result);
    } catch (err) { next(err); }
}

module.exports = {
    create,
    listActive,
    getByOwner,
    adminMachineryStats,
    adminAllMachinery,
    adminSetMachineryStatus,
    getById,
    update,
    remove,
    addImage,
    getImages,
    getCovers,
    deleteImage,
    updateAvailability,
    getAvailability,
    internalSetDisponible,
    internalUpdateRating,
    toggleFavorite,
    getFavorites,
    checkFavorite,
};
