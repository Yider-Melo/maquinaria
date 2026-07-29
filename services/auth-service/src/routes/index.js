const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, validateParams, uuidParam, validateToken, requireRole, schemas, errorHandler } = require('shared');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh', validate(schemas.refreshToken), authController.refresh);
router.post('/logout', validate(schemas.refreshToken), authController.logout);
router.post('/logout-all', validateToken, authController.logoutAll);
router.get('/profile', validateToken, authController.getProfile);
router.patch('/profile', validateToken, validate(schemas.updateProfile), authController.updateProfile);
router.put('/profile/password', validateToken, validate(schemas.changePassword), authController.changePassword);
router.post('/profile/verify-email', validateToken, authController.verifyEmail);
router.post('/2fa/setup', validateToken, authController.setup2FA);
router.post('/2fa/verify', validateToken, validate(schemas.verify2FA), authController.verify2FA);
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(schemas.resetPassword), authController.resetPassword);
router.post('/validate-token', validate(schemas.validateToken), authController.validateToken);
router.get('/users/stats', validateToken, requireRole('admin'), authController.adminUserStats);
router.get('/users', validateToken, requireRole('admin'), authController.adminListUsers);
router.put('/users/:id/status', validateToken, requireRole('admin'), validateParams(uuidParam('id')), authController.adminSetUserStatus);
router.get('/users/:id', validateParams(uuidParam('id')), authController.getUserById);

router.get('/verify-email/:token', authController.verifyEmailByToken);
router.delete('/profile', validateToken, authController.deleteAccount);
router.get('/bank-account', validateToken, authController.getBankAccount);
router.put('/bank-account', validateToken, authController.saveBankAccount);
router.delete('/bank-account', validateToken, authController.deleteBankAccount);

function internalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== (process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev')) {
        return res.status(403).json({ success: false, error: { message: 'API key inválida' } });
    }
    next();
}
router.get('/internal/users/:id/bank-account', internalAuth, validateParams(uuidParam('id')), authController.getBankAccountInternal);

router.use(errorHandler);

module.exports = router;
