const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { ConflictError, NotFoundError, UnauthorizedError, ValidationError } = require('shared');
const usuarioRepository = require('../repositories/usuarioRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'rentamaq-secret-key-dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function register({ email, password, nombre, apellido, telefono, tipo_usuario }) {
    const existing = await usuarioRepository.findByEmail(email);
    if (existing) {
        throw new ConflictError('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const tokenVerificacion = uuidv4();
    const id = uuidv4();

    await usuarioRepository.insert({ id, email, passwordHash, nombre, apellido, telefono, tipo_usuario, tokenVerificacion });

    return { id, email, nombre, apellido, tipo_usuario, token_verificacion: tokenVerificacion };
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

    const token = jwt.sign(
        { id: user.id, email: user.email, tipo_usuario: user.tipo_usuario, nombre: user.nombre, apellido: user.apellido },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
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
    if (data.telefono) { fields.push(`telefono = $${idx++}`); values.push(data.telefono); }
    if (data.foto_url) { fields.push(`foto_url = $${idx++}`); values.push(data.foto_url); }

    if (fields.length === 0) return getProfile(userId);

    await usuarioRepository.updateProfile(userId, fields, values);
    return getProfile(userId);
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
    if (!user) return { success: true };

    const token = uuidv4();
    const expiracion = new Date(Date.now() + 60 * 60 * 1000);
    await usuarioRepository.setResetToken(user.id, token, expiracion);

    return { success: true };
}

async function resetPassword(token, newPassword) {
    const user = await usuarioRepository.findByResetToken(token);
    if (!user) {
        throw new ValidationError('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await usuarioRepository.updatePassword(user.id, passwordHash);

    return { success: true };
}

async function validateToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

async function adminListUsers(page = 1, size = 20) {
    const { data, total } = await usuarioRepository.findAll(page, size);
    return { data, total, page, size };
}

async function adminUserStats() {
    return await usuarioRepository.getStats();
}

module.exports = {
    register, login, getProfile, updateProfile,
    setup2FA, verify2FA, forgotPassword, resetPassword,
    validateToken, adminListUsers, adminUserStats
};
