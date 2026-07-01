// Controlador de autenticacion.
// Maneja registro, login, perfil, 2FA y recuperacion de contrasena.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { ConflictError, NotFoundError, UnauthorizedError, ValidationError } = require('shared');

const JWT_SECRET = process.env.JWT_SECRET || 'rentamaq-secret-key-dev';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Registra un nuevo usuario. Verifica que el email no exista, hashea la contrasena y guarda.
async function register({ email, password, nombre, apellido, telefono, tipo_usuario }) {
    const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        throw new ConflictError('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const tokenVerificacion = uuidv4();
    const id = uuidv4();

    await pool.query(
        `INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, token_verificacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, email, passwordHash, nombre, apellido, telefono, tipo_usuario, tokenVerificacion]
    );

    return {
        id,
        email,
        nombre,
        apellido,
        tipo_usuario,
        token_verificacion: tokenVerificacion
    };
}

// Inicia sesion. Verifica credenciales y devuelve un token JWT con los datos del usuario.
async function login({ email, password }) {
    const result = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
        [email]
    );

    if (result.rows.length === 0) {
        throw new UnauthorizedError('Credenciales inválidas');
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
        throw new UnauthorizedError('Credenciales inválidas');
    }

    await pool.query(
        'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
    );

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            tipo_usuario: user.tipo_usuario,
            nombre: user.nombre,
            apellido: user.apellido
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        usuario: {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            apellido: user.apellido,
            tipo_usuario: user.tipo_usuario,
            foto_url: user.foto_url
        }
    };
}

// Obtiene el perfil completo de un usuario por su ID.
async function getProfile(userId) {
    const result = await pool.query(
        `SELECT id, email, nombre, apellido, telefono, tipo_usuario, foto_url,
                email_verificado, verificado_2fa, activo, ultimo_acceso, creado_en
         FROM usuarios WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Usuario no encontrado');
    }

    return result.rows[0];
}

// Actualiza solo los campos enviados del perfil del usuario.
async function updateProfile(userId, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.nombre) { fields.push(`nombre = $${idx++}`); values.push(data.nombre); }
    if (data.apellido) { fields.push(`apellido = $${idx++}`); values.push(data.apellido); }
    if (data.telefono) { fields.push(`telefono = $${idx++}`); values.push(data.telefono); }
    if (data.foto_url) { fields.push(`foto_url = $${idx++}`); values.push(data.foto_url); }

    if (fields.length === 0) return getProfile(userId);

    fields.push(`actualizado_en = CURRENT_TIMESTAMP`);
    values.push(userId);

    await pool.query(
        `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
    );

    return getProfile(userId);
}

// Configura 2FA generando un secreto y un codigo QR para la app de autenticacion.
async function setup2FA(userId) {
    const secret = speakeasy.generateSecret({ name: `Rentamaq:${userId}` });
    await pool.query(
        'UPDATE usuarios SET secreto_2fa = $1, verificado_2fa = false WHERE id = $2',
        [secret.base32, userId]
    );

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode: qrCodeUrl };
}

// Verifica un codigo 2FA generado por la app del usuario.
// Marca el 2FA como verificado en la BD si el codigo es correcto.
async function verify2FA(userId, token) {
    const result = await pool.query(
        'SELECT secreto_2fa FROM usuarios WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].secreto_2fa) {
        throw new ValidationError('2FA no configurado');
    }

    const verified = speakeasy.totp.verify({
        secret: result.rows[0].secreto_2fa,
        encoding: 'base32',
        token,
        window: 1
    });

    if (!verified) {
        throw new UnauthorizedError('Código 2FA inválido');
    }

    await pool.query(
        'UPDATE usuarios SET verificado_2fa = true WHERE id = $1',
        [userId]
    );

    return true;
}

// Genera un token de recuperacion de contrasena valido por 1 hora.
// Siempre devuelve exito para no revelar si el email existe.
async function forgotPassword(email) {
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return { success: true };

    const token = uuidv4();
    const expiracion = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
        'UPDATE usuarios SET token_recuperacion = $1, expiracion_token_recuperacion = $2 WHERE id = $3',
        [token, expiracion, result.rows[0].id]
    );

    return { success: true };
}

// Restablece la contrasena usando un token valido y no expirado.
async function resetPassword(token, newPassword) {
    const result = await pool.query(
        'SELECT id FROM usuarios WHERE token_recuperacion = $1 AND expiracion_token_recuperacion > CURRENT_TIMESTAMP',
        [token]
    );

    if (result.rows.length === 0) {
        throw new ValidationError('Token inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
        'UPDATE usuarios SET password_hash = $1, token_recuperacion = NULL, expiracion_token_recuperacion = NULL, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, result.rows[0].id]
    );

    return { success: true };
}

// Verifica si un token JWT es valido, devuelve los datos decodificados o null.
async function validateToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    setup2FA,
    verify2FA,
    forgotPassword,
    resetPassword,
    validateToken
};
