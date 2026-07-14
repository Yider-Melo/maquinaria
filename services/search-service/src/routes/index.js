const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { validate, validateQuery, validateParams, uuidParam, validateToken, success, errorHandler, schemas } = require('shared');

router.get('/', validateQuery(schemas.busqueda), searchController.search);
router.get('/suggestions', searchController.getSuggestions);
router.get('/nearby', validateQuery(schemas.nearbySearch), searchController.getNearby);
router.post('/index', validateToken, searchController.indexMachinery);
router.delete('/index/:id', validateToken, validateParams(uuidParam('id')), searchController.removeFromIndex);

router.use(errorHandler);

module.exports = router;
