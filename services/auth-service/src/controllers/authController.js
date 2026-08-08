const authService = require('../services/authService');
const { success, paginated } = require('shared');

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

async function refresh(req, res, next) {
    try {
        const result = await authService.refreshToken(req.body.refresh_token);
        success(res, result);
    } catch (err) { next(err); }
}

async function logout(req, res, next) {
    try {
        const result = await authService.logout(req.body.refresh_token);
        success(res, result);
    } catch (err) { next(err); }
}

async function logoutAll(req, res, next) {
    try {
        const result = await authService.logoutAll(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
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

async function resendVerificationEmail(req, res, next) {
    try {
        const result = await authService.resendVerificationEmail(req.body.email);
        success(res, result);
    } catch (err) { next(err); }
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

async function validateToken(req, res, next) {
    try {
        const decoded = await authService.validateToken(req.body.token);
        success(res, { valid: !!decoded, user: decoded });
    } catch (err) {
        next(err);
    }
}

async function adminListUsers(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 20;
        const q = (req.query.q || '').trim();
        const { data, total } = await authService.adminListUsers(page, size, q);
        paginated(res, data, total, page, size);
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

async function getUserById(req, res, next) {
    try {
        const user = await authService.getProfile(req.params.id);
        success(res, user);
    } catch (err) { next(err); }
}

async function verifyEmailByToken(req, res, next) {
    try {
        const result = await authService.verifyEmailByToken(req.params.token);
        success(res, { message: 'Correo verificado correctamente', user: result });
    } catch (err) { next(err); }
}

async function deleteAccount(req, res, next) {
    try {
        const result = await authService.deleteAccount(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function getBankAccount(req, res, next) {
    try {
        const cuenta = await authService.getBankAccount(req.user.id);
        success(res, cuenta);
    } catch (err) { next(err); }
}

async function saveBankAccount(req, res, next) {
    try {
        const cuenta = await authService.saveBankAccount(req.user.id, req.body);
        success(res, cuenta);
    } catch (err) { next(err); }
}

async function deleteBankAccount(req, res, next) {
    try {
        const result = await authService.deleteBankAccount(req.user.id);
        success(res, result);
    } catch (err) { next(err); }
}

async function getBankAccountInternal(req, res, next) {
    try {
        const cuenta = await authService.getBankAccountInternal(req.params.id);
        success(res, cuenta);
    } catch (err) { next(err); }
}

module.exports = {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    getProfile,
    updateProfile,
    changePassword,
    verifyEmail,
    resendVerificationEmail,
    setup2FA,
    verify2FA,
    forgotPassword,
    resetPassword,
    validateToken,
    adminListUsers,
    adminUserStats,
    adminSetUserStatus,
    getUserById,
    getBankAccount,
    saveBankAccount,
    deleteBankAccount,
    getBankAccountInternal,
    verifyEmailByToken,
    deleteAccount,
};
