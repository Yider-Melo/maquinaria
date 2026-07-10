const express = require('express');
const router = express.Router();
const machineryController = require('../controllers/machineryController');
const { validate, validateToken, requireRole, schemas, errorHandler } = require('shared');

router.post('/', validateToken, validate(schemas.maquinaria), machineryController.create);
router.get('/', machineryController.listActive);
router.get('/owner', validateToken, machineryController.getByOwner);
router.get('/stats', validateToken, requireRole('admin'), machineryController.adminMachineryStats);
router.get('/all', validateToken, requireRole('admin'), machineryController.adminAllMachinery);
router.put('/all/:id/status', validateToken, requireRole('admin'), machineryController.adminSetMachineryStatus);
router.get('/:id', machineryController.getById);
router.put('/:id', validateToken, machineryController.update);
router.delete('/:id', validateToken, machineryController.remove);
router.post('/:id/images', validateToken, machineryController.addImage);
router.get('/:id/images', machineryController.getImages);
router.delete('/:id/images/:imageId', validateToken, machineryController.deleteImage);
router.put('/:id/availability', validateToken, machineryController.updateAvailability);
router.get('/:id/availability', machineryController.getAvailability);

router.use(errorHandler);

module.exports = router;
