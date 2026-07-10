const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { validateToken, requireRole, errorHandler } = require('shared');

router.post('/', validateToken, ratingController.create);
router.get('/user/:userId', ratingController.getByUser);
router.get('/user/:userId/average', ratingController.getAverage);
router.get('/stats', validateToken, requireRole('admin'), ratingController.adminRatingStats);
router.get('/machinery/:machineryId', ratingController.getByMachinery);
router.put('/:id', validateToken, ratingController.update);
router.delete('/:id', validateToken, ratingController.remove);
router.post('/:id/report', validateToken, ratingController.report);

router.use(errorHandler);

module.exports = router;
