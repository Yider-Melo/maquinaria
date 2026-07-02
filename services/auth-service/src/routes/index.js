// Rutas del servicio de autenticacion.
// Define los endpoints publicos y protegidos para gestion de usuarios.
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, validateToken, requireRole, schemas, success, errorHandler } = require('shared');

// Registro de nuevo usuario
router.post('/register', validate(schemas.register), async (req, res, next) => {
    try {
        const result = await authController.register(req.body);
        success(res, result, 201);
    } catch (err) {
        next(err);
    }
});

// Inicio de sesion, devuelve token JWT
router.post('/login', validate(schemas.login), async (req, res, next) => {
    try {
        const result = await authController.login(req.body);
        success(res, result);
    } catch (err) {
        next(err);
    }
});

// Obtener perfil del usuario autenticado
router.get('/profile', validateToken, async (req, res, next) => {
    try {
        const profile = await authController.getProfile(req.user.id);
        success(res, profile);
    } catch (err) {
        next(err);
    }
});

// Actualizar perfil del usuario autenticado
router.put('/profile', validateToken, async (req, res, next) => {
    try {
        const profile = await authController.updateProfile(req.user.id, req.body);
        success(res, profile);
    } catch (err) {
        next(err);
    }
});

// Configurar autenticacion de dos factores (2FA)
router.post('/2fa/setup', validateToken, async (req, res, next) => {
    try {
        const result = await authController.setup2FA(req.user.id);
        success(res, result);
    } catch (err) {
        next(err);
    }
});

// Verificar codigo 2FA
router.post('/2fa/verify', validateToken, async (req, res, next) => {
    try {
        await authController.verify2FA(req.user.id, req.body.token);
        success(res, { message: '2FA verificado correctamente' });
    } catch (err) {
        next(err);
    }
});

// Solicitar restablecimiento de contrasena
router.post('/forgot-password', async (req, res, next) => {
    try {
        const result = await authController.forgotPassword(req.body.email);
        success(res, result);
    } catch (err) {
        next(err);
    }
});

// Restablecer contrasena con token recibido por email
router.post('/reset-password', async (req, res, next) => {
    try {
        await authController.resetPassword(req.body.token, req.body.password);
        success(res, { message: 'Contraseña actualizada' });
    } catch (err) {
        next(err);
    }
});

// Validar si un token JWT sigue siendo valido
router.post('/validate-token', async (req, res) => {
    const decoded = await authController.validateToken(req.body.token);
    success(res, { valid: !!decoded, user: decoded });
});

router.get('/users', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await authController.adminListUsers(page, size);
        success(res, result);
    } catch (err) { next(err); }
});

router.get('/users/stats', validateToken, requireRole('admin'), async (req, res, next) => {
    try {
        const stats = await authController.adminUserStats();
        success(res, stats);
    } catch (err) { next(err); }
});

router.use(errorHandler);

module.exports = router;
