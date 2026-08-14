const ratingService = require('../services/ratingService');
const { success, paginated } = require('shared');

async function create(req, res, next) {
    try {
        const rating = await ratingService.create(req.body, req.user.id);
        success(res, rating, 201);
    } catch (err) { next(err); }
}

async function getByUser(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await ratingService.getByUser(req.params.userId, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function getMyRatings(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await ratingService.getMyRatings(req.user.id, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function getAverage(req, res, next) {
    try {
        const average = await ratingService.getAverage(req.params.userId);
        success(res, average);
    } catch (err) { next(err); }
}

async function adminRatingStats(req, res, next) {
    try {
        const stats = await ratingService.adminRatingStats();
        success(res, stats);
    } catch (err) { next(err); }
}

async function adminListReported(req, res, next) {
    try {
        const reportadas = await ratingService.adminListReported();
        success(res, reportadas);
    } catch (err) { next(err); }
}

async function adminResolveRating(req, res, next) {
    try {
        const result = await ratingService.adminResolveRating(req.params.id, req.body.accion);
        success(res, result);
    } catch (err) { next(err); }
}

async function getByMachinery(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await ratingService.getByMachinery(req.params.machineryId, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function getById(req, res, next) {
    try {
        const rating = await ratingService.getById(req.params.id);
        success(res, rating);
    } catch (err) { next(err); }
}

async function update(req, res, next) {
    try {
        const rating = await ratingService.update(req.params.id, req.body, req.user.id);
        success(res, rating);
    } catch (err) { next(err); }
}

async function remove(req, res, next) {
    try {
        await ratingService.remove(req.params.id, req.user.id);
        res.status(204).end();
    } catch (err) { next(err); }
}

async function report(req, res, next) {
    try {
        const rating = await ratingService.report(req.params.id, req.user.id, req.body.motivo);
        success(res, rating);
    } catch (err) { next(err); }
}

module.exports = {
    create,
    getById,
    getByUser,
    getMyRatings,
    getAverage,
    adminRatingStats,
    adminListReported,
    adminResolveRating,
    getByMachinery,
    update,
    remove,
    report,
};
