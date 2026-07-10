const searchService = require('../services/searchService');
const { success } = require('shared');

async function search(req, res, next) {
    try {
        const result = await searchService.search(req.query);
        success(res, result);
    } catch (err) { next(err); }
}

async function getSuggestions(req, res, next) {
    try {
        const suggestions = await searchService.getSuggestions(req.query.q || '');
        success(res, suggestions);
    } catch (err) { next(err); }
}

async function getNearby(req, res, next) {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseInt(req.query.radius) || 50;
        const result = await searchService.getNearby(lat, lng, radius);
        success(res, result);
    } catch (err) { next(err); }
}

async function indexMachinery(req, res, next) {
    try {
        await searchService.indexMachinery(req.body);
        success(res, { message: 'Indexado correctamente' });
    } catch (err) { next(err); }
}

async function removeFromIndex(req, res, next) {
    try {
        await searchService.removeFromIndex(req.params.id);
        success(res, { message: 'Eliminado del índice' });
    } catch (err) { next(err); }
}

module.exports = {
    search,
    getSuggestions,
    getNearby,
    indexMachinery,
    removeFromIndex,
};
