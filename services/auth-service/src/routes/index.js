const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, validateToken, requireRole, schemas, errorHandler } = require('shared');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.get('/profile', validateToken, authController.getProfile);
router.put('/profile', validateToken, authController.updateProfile);
router.put('/profile/password', validateToken, authController.changePassword);
router.post('/profile/verify-email', validateToken, authController.verifyEmail);
router.post('/2fa/setup', validateToken, authController.setup2FA);
router.post('/2fa/verify', validateToken, authController.verify2FA);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', validate(schemas.resetPassword), authController.resetPassword);
router.post('/validate-token', authController.validateToken);
router.get('/users', validateToken, requireRole('admin'), authController.adminListUsers);
router.get('/users/stats', validateToken, requireRole('admin'), authController.adminUserStats);
router.put('/users/:id/status', validateToken, requireRole('admin'), authController.adminSetUserStatus);

router.use(errorHandler);

module.exports = router;
