const bookingService = require('../services/bookingService');
const { success, paginated } = require('shared');

async function create(req, res, next) {
    try {
        const booking = await bookingService.create(req.body, req.user.id);
        success(res, booking, 201);
    } catch (err) { next(err); }
}

async function checkAvailability(req, res, next) {
    try {
        const result = await bookingService.checkAvailability(req.query.machineryId, req.query.start, req.query.end);
        success(res, result);
    } catch (err) { next(err); }
}

async function getMyBookings(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await bookingService.getByUser(req.user.id, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function adminBookingStats(req, res, next) {
    try {
        const stats = await bookingService.adminBookingStats();
        success(res, stats);
    } catch (err) { next(err); }
}

async function adminRecentBookings(req, res, next) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const bookings = await bookingService.adminRecentBookings(limit);
        success(res, bookings);
    } catch (err) { next(err); }
}

async function getOccupiedDates(req, res, next) {
    try {
        const result = await bookingService.getOccupiedDates(req.params.machineryId, req.query.start, req.query.end);
        success(res, result);
    } catch (err) { next(err); }
}

async function getInternalById(req, res, next) {
    try {
        const booking = await bookingService.getInternalById(req.params.id);
        success(res, booking);
    } catch (err) { next(err); }
}

async function getMyListings(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const { data, total } = await bookingService.getByOwner(req.user.id, page, size);
        paginated(res, data, total, page, size);
    } catch (err) { next(err); }
}

async function getById(req, res, next) {
    try {
        const booking = await bookingService.getById(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
}

async function confirm(req, res, next) {
    try {
        const booking = await bookingService.confirm(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
}

async function reject(req, res, next) {
    try {
        const booking = await bookingService.reject(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
}

async function cancel(req, res, next) {
    try {
        const booking = await bookingService.cancel(req.params.id, req.user.id, req.body.motivo);
        success(res, booking);
    } catch (err) { next(err); }
}

async function markAsPaid(req, res, next) {
    try {
        const booking = await bookingService.markAsPaid(req.params.id);
        success(res, booking);
    } catch (err) { next(err); }
}

async function complete(req, res, next) {
    try {
        const booking = await bookingService.complete(req.params.id, req.user.id);
        success(res, booking);
    } catch (err) { next(err); }
}

module.exports = {
    create,
    checkAvailability,
    getMyBookings,
    adminBookingStats,
    adminRecentBookings,
    getOccupiedDates,
    getInternalById,
    getMyListings,
    getById,
    confirm,
    reject,
    cancel,
    markAsPaid,
    complete,
};
