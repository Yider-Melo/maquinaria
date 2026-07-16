const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { ConflictError, NotFoundError, UnauthorizedError, ValidationError, getJwtSecret } = require('shared');
const usuarioRepository = require('../repositories/usuarioRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;

function ensureStrongPassword(password) {
    if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
        throw new ValidationError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número');
    }
}

async function register({ email, password, nombre, apellido, telefono, tipo_usuario }) {
    ensureStrongPassword(password);
    const existing = await usuarioRepository.findByEmail(email);
    if (existing) {
        throw new ConflictError('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const tokenVerificacion = uuidv4();
    const id = uuidv4();

    await usuarioRepository.insert({ id, email, passwordHash, nombre, apellido, telefono: telefono || null, tipo_usuario, tokenVerificacion });

    return { id, email, nombre, apellido, tipo_usuario };
}

async function login({ email, password }) {
    const user = await usuarioRepository.findByEmailWithPassword(email);
    if (!user) {
        throw new UnauthorizedError('Credenciales inválidas');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new UnauthorizedError('Credenciales inválidas');
    }

    await usuarioRepository.updateLastAccess(user.id);

    const accessToken = jwt.sign(
        { id: user.id, email: user.email, tipo_usuario: user.tipo_usuario },
        getJwtSecret(),
        { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const expiraEn = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.create(user.id, refreshTokenValue, expiraEn);

    return {
        token: accessToken,
        refresh_token: refreshTokenValue,
        expires_in: JWT_EXPIRES_IN,
        usuario: {
            id: user.id, email: user.email, nombre: user.nombre,
            apellido: user.apellido, tipo_usuario: user.tipo_usuario, foto_url: user.foto_url
        }
    };
}

async function getProfile(userId) {
    const user = await usuarioRepository.findById(userId);
    if (!user) {
        throw new NotFoundError('Usuario no encontrado');
    }
    return user;
}

async function updateProfile(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.nombre) { fields.push(`nombre = $${idx++}`); values.push(data.nombre); }
    if (data.apellido) { fields.push(`apellido = $${idx++}`); values.push(data.apellido); }
    if (data.telefono !== undefined) { fields.push(`telefono = $${idx++}`); values.push(data.telefono || null); }
    if (data.departamento !== undefined) { fields.push(`departamento = $${idx++}`); values.push(data.departamento); }
    if (data.foto_url) { fields.push(`foto_url = $${idx++}`); values.push(data.foto_url); }

    if (fields.length === 0) return getProfile(userId);

    await usuarioRepository.updateProfile(userId, fields, values);
    return getProfile(userId);
}

async function changePassword(userId, currentPassword, newPassword) {
    ensureStrongPassword(newPassword);
    const user = await usuarioRepository.findByIdWithPassword(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) throw new UnauthorizedError('Contraseña actual incorrecta');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await usuarioRepository.updatePassword(userId, passwordHash);
    await refreshTokenRepository.revokeAllByUser(userId);
    return { message: 'Contraseña actualizada correctamente. Se han cerrado todas las sesiones activas.' };
}

async function verifyEmail(userId) {
    const user = await usuarioRepository.verifyEmail(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
}

async function setup2FA(userId) {
    const secret = speakeasy.generateSecret({ name: `Rentamaq:${userId}` });
    await usuarioRepository.update2FASecret(userId, secret.base32);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode: qrCodeUrl };
}

async function verify2FA(userId, token) {
    const user = await usuarioRepository.findSecret2FA(userId);
    if (!user || !user.secreto_2fa) {
        throw new ValidationError('2FA no configurado');
    }

    const verified = speakeasy.totp.verify({
        secret: user.secreto_2fa, encoding: 'base32', token, window: 1
    });

    if (!verified) {
        throw new UnauthorizedError('Código 2FA inválido');
    }

    await usuarioRepository.verify2FA(userId);
    return true;
}

async function forgotPassword(email) {
    const user = await usuarioRepository.findIdByEmail(email);
    if (!user) {
        await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
        return { success: true };
    }

    const token = uuidv4();
    const expiracion = new Date(Date.now() + 60 * 60 * 1000);
    await usuarioRepository.setResetToken(user.id, token, expiracion);

    return { success: true };
}

async function resetPassword(token, newPassword) {
    ensureStrongPassword(newPassword);
    const user = await usuarioRepository.findByResetToken(token);
    if (!user) {
        throw new ValidationError('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await usuarioRepository.updatePassword(user.id, passwordHash);

    return { success: true };
}

async function refreshToken(refreshTokenValue) {
    const stored = await refreshTokenRepository.findByToken(refreshTokenValue);
    if (!stored) {
        throw new UnauthorizedError('Refresh token inválido o expirado');
    }
    if (!stored.activo) {
        throw new UnauthorizedError('Usuario desactivado');
    }

    await refreshTokenRepository.revoke(refreshTokenValue);

    const accessToken = jwt.sign(
        { id: stored.usuario_id },
        getJwtSecret(),
        { expiresIn: JWT_EXPIRES_IN }
    );

    const newRefreshTokenValue = crypto.randomBytes(40).toString('hex');
    const expiraEn = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.create(stored.usuario_id, newRefreshTokenValue, expiraEn);

    return {
        token: accessToken,
        refresh_token: newRefreshTokenValue,
        expires_in: JWT_EXPIRES_IN
    };
}

async function logout(refreshTokenValue) {
    await refreshTokenRepository.revoke(refreshTokenValue);
    return { message: 'Sesión cerrada correctamente' };
}

async function logoutAll(userId) {
    await refreshTokenRepository.revokeAllByUser(userId);
    return { message: 'Todas las sesiones cerradas' };
}

async function validateToken(token) {
    try {
        return jwt.verify(token, getJwtSecret());
    } catch {
        return null;
    }
}

async function adminListUsers(page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await usuarioRepository.findAll(page, size);
    return { data, total, page, size };
}

async function adminUserStats() {
    return await usuarioRepository.getStats();
}

async function adminSetUserStatus(userId, active) {
    const user = await usuarioRepository.setActive(userId, active);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
}

module.exports = {
    register, login, getProfile, updateProfile, changePassword, verifyEmail,
    setup2FA, verify2FA, forgotPassword, resetPassword,
    refreshToken, logout, logoutAll,
    validateToken, adminListUsers, adminUserStats, adminSetUserStatus
};
