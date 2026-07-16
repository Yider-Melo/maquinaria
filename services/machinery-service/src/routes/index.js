const express = require('express');
const router = express.Router();
const machineryController = require('../controllers/machineryController');
const { validate, validateParams, uuidParam, validateToken, requireRole, schemas, errorHandler } = require('shared');

router.post('/', validateToken, requireRole('propietario'), validate(schemas.maquinaria), machineryController.create);
router.get('/', machineryController.listActive);
router.get('/owner', validateToken, machineryController.getByOwner);
router.get('/stats', validateToken, requireRole('admin'), machineryController.adminMachineryStats);
router.get('/all', validateToken, requireRole('admin'), machineryController.adminAllMachinery);
router.put('/all/:id/status', validateToken, requireRole('admin'), validateParams(uuidParam('id')), machineryController.adminSetMachineryStatus);
router.get('/:id', validateParams(uuidParam('id')), machineryController.getById);
router.put('/:id', validateToken, validateParams(uuidParam('id')), validate(schemas.maquinaria), machineryController.update);
router.patch('/:id', validateToken, requireRole('propietario'), validateParams(uuidParam('id')), validate(schemas.maquinariaPatch), machineryController.update);
router.delete('/:id', validateToken, validateParams(uuidParam('id')), machineryController.remove);
router.post('/:id/images', validateToken, validateParams(uuidParam('id')), validate(schemas.createImage), machineryController.addImage);
router.get('/:id/images', validateParams(uuidParam('id')), machineryController.getImages);
router.delete('/:id/images/:imageId', validateToken, validateParams(uuidParam('id')), machineryController.deleteImage);
router.put('/:id/availability', validateToken, validateParams(uuidParam('id')), validate(schemas.updateAvailability), machineryController.updateAvailability);
router.get('/:id/availability', validateParams(uuidParam('id')), machineryController.getAvailability);

router.use(errorHandler);

module.exports = router;
