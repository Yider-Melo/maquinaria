const ratingService = require('../services/ratingService');
const { success } = require('shared');

async function create(req, res, next) {
    try {
        const rating = await ratingService.create(req.body, req.user.id);
        success(res, rating, 201);
    } catch (err) { next(err); }
}

async function getByUser(req, res, next) {
    try {
        const ratings = await ratingService.getByUser(req.params.userId);
        success(res, ratings);
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

async function getByMachinery(req, res, next) {
    try {
        const ratings = await ratingService.getByMachinery(req.params.machineryId);
        success(res, ratings);
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
        const result = await ratingService.remove(req.params.id, req.user.id);
        success(res, result);
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
    getByUser,
    getAverage,
    adminRatingStats,
    getByMachinery,
    update,
    remove,
    report,
};
