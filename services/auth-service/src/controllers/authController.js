const authService = require('../services/authService');
const { success } = require('shared');

async function register(req, res, next) {
    try {
        const result = await authService.register(req.body);
        success(res, result, 201);
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        success(res, result);
    } catch (err) {
        next(err);
    }
}

async function getProfile(req, res, next) {
    try {
        const profile = await authService.getProfile(req.user.id);
        success(res, profile);
    } catch (err) {
        next(err);
    }
}

async function updateProfile(req, res, next) {
    try {
        const profile = await authService.updateProfile(req.user.id, req.body);
        success(res, profile);
    } catch (err) {
        next(err);
    }
}

async function changePassword(req, res, next) {
    try {
        const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
        success(res, result);
    } catch (err) {
        next(err);
    }
}

async function verifyEmail(req, res, next) {
    try {
        const profile = await authService.verifyEmail(req.user.id);
        success(res, profile);
    } catch (err) {
        next(err);
    }
}

async function setup2FA(req, res, next) {
    try {
        const result = await authService.setup2FA(req.user.id);
        success(res, result);
    } catch (err) {
        next(err);
    }
}

async function verify2FA(req, res, next) {
    try {
        await authService.verify2FA(req.user.id, req.body.token);
        success(res, { message: '2FA verificado correctamente' });
    } catch (err) {
        next(err);
    }
}

async function forgotPassword(req, res, next) {
    try {
        const result = await authService.forgotPassword(req.body.email);
        success(res, result);
    } catch (err) {
        next(err);
    }
}

async function resetPassword(req, res, next) {
    try {
        await authService.resetPassword(req.body.token, req.body.password);
        success(res, { message: 'Contraseña actualizada' });
    } catch (err) {
        next(err);
    }
}

async function validateToken(req, res) {
    const decoded = await authService.validateToken(req.body.token);
    success(res, { valid: !!decoded, user: decoded });
}

async function adminListUsers(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const result = await authService.adminListUsers(page, size);
        success(res, result);
    } catch (err) { next(err); }
}

async function adminUserStats(req, res, next) {
    try {
        const stats = await authService.adminUserStats();
        success(res, stats);
    } catch (err) { next(err); }
}

async function adminSetUserStatus(req, res, next) {
    try {
        const user = await authService.adminSetUserStatus(req.params.id, req.body.activo === true);
        success(res, user);
    } catch (err) { next(err); }
}

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    verifyEmail,
    setup2FA,
    verify2FA,
    forgotPassword,
    resetPassword,
    validateToken,
    adminListUsers,
    adminUserStats,
    adminSetUserStatus,
};
