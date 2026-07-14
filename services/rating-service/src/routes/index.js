const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { validate, validateParams, uuidParam, validateToken, requireRole, errorHandler, schemas } = require('shared');

router.post('/', validateToken, validate(schemas.calificacion), ratingController.create);
router.get('/user/:userId', validateParams(uuidParam('userId')), ratingController.getByUser);
router.get('/user/:userId/average', validateParams(uuidParam('userId')), ratingController.getAverage);
router.get('/my', validateToken, ratingController.getMyRatings);
router.get('/stats', validateToken, requireRole('admin'), ratingController.adminRatingStats);
router.get('/machinery/:machineryId', validateParams(uuidParam('machineryId')), ratingController.getByMachinery);
router.put('/:id', validateToken, validateParams(uuidParam('id')), ratingController.update);
router.delete('/:id', validateToken, validateParams(uuidParam('id')), ratingController.remove);
router.post('/:id/report', validateToken, validateParams(uuidParam('id')), ratingController.report);

router.use(errorHandler);

module.exports = router;
