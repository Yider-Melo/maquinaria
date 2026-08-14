const express = require('express');
const router = express.Router();
const machineryController = require('../controllers/machineryController');
const { validate, validateParams, uuidParam, validateToken, requireRole, schemas, errorHandler, ForbiddenError, getInternalApiKey } = require('shared');
const createServiceLogger = require('../../../../shared/logger');
const logger = createServiceLogger('machinery-routes');

router.post('/', validateToken, requireRole('propietario'), validate(schemas.maquinaria), machineryController.create);
router.get('/', machineryController.listActive);
router.get('/owner', validateToken, machineryController.getByOwner);
router.get('/stats', validateToken, requireRole('admin'), machineryController.adminMachineryStats);
router.get('/all', validateToken, requireRole('admin'), machineryController.adminAllMachinery);
router.put('/all/:id/status', validateToken, requireRole('admin'), validateParams(uuidParam('id')), machineryController.adminSetMachineryStatus);
router.get('/covers', machineryController.getCovers);
router.get('/:id', validateParams(uuidParam('id')), machineryController.getById);
router.put('/:id', validateToken, requireRole('propietario'), validateParams(uuidParam('id')), validate(schemas.maquinaria), machineryController.update);
router.patch('/:id', validateToken, requireRole('propietario'), validateParams(uuidParam('id')), validate(schemas.maquinariaPatch), machineryController.update);
router.delete('/:id', validateToken, requireRole('propietario'), validateParams(uuidParam('id')), machineryController.remove);
router.post('/:id/images', validateToken, validateParams(uuidParam('id')), validate(schemas.createImage), machineryController.addImage);
router.get('/:id/images', validateParams(uuidParam('id')), machineryController.getImages);
router.delete('/:id/images/:imageId', validateToken, validateParams(uuidParam('id')), machineryController.deleteImage);
router.put('/:id/availability', validateToken, validateParams(uuidParam('id')), validate(schemas.updateAvailability), machineryController.updateAvailability);
router.get('/:id/availability', validateParams(uuidParam('id')), machineryController.getAvailability);

const INTERNAL_API_KEY = getInternalApiKey();

function internalAuth(req, res, next) {
    if (req.headers['x-api-key'] !== INTERNAL_API_KEY) {
        return next(new ForbiddenError('API key inválida'));
    }
    next();
}

router.patch('/internal/:id/disponible', internalAuth, validateParams(uuidParam('id')), machineryController.internalSetDisponible);
router.put('/internal/:id/rating', internalAuth, validateParams(uuidParam('id')), machineryController.internalUpdateRating);

router.post('/:id/favorite', validateToken, validateParams(uuidParam('id')), machineryController.toggleFavorite);
router.delete('/:id/favorite', validateToken, validateParams(uuidParam('id')), machineryController.toggleFavorite);
router.get('/:id/favorite', validateToken, validateParams(uuidParam('id')), machineryController.checkFavorite);
router.get('/favorites/list', validateToken, machineryController.getFavorites);

router.use(errorHandler);

module.exports = router;
