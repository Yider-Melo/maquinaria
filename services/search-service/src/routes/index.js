const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { validateQuery, validateToken, success, errorHandler, schemas } = require('shared');

router.get('/', validateQuery(schemas.busqueda), searchController.search);
router.get('/suggestions', searchController.getSuggestions);
router.get('/nearby', searchController.getNearby);
router.post('/index', validateToken, searchController.indexMachinery);
router.delete('/index/:id', validateToken, searchController.removeFromIndex);

router.use(errorHandler);

module.exports = router;
