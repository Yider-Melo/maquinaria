const pool = require('../db');

async function findByEmail(email) {
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    return result.rows[0] || null;
}

async function findById(id) {
    const result = await pool.query(
        `SELECT id, email, nombre, apellido, telefono, tipo_usuario, foto_url,
                email_verificado, verificado_2fa, activo, ultimo_acceso, creado_en
         FROM usuarios WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

async function findByEmailWithPassword(email) {
    const result = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
        [email]
    );
    return result.rows[0] || null;
}

async function findByIdWithPassword(id) {
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1 AND activo = true', [id]);
    return result.rows[0] || null;
}

async function insert({ id, email, passwordHash, nombre, apellido, telefono, tipo_usuario, tokenVerificacion }) {
    await pool.query(
        `INSERT INTO usuarios (id, email, password_hash, nombre, apellido, telefono, tipo_usuario, token_verificacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, email, passwordHash, nombre, apellido, telefono, tipo_usuario, tokenVerificacion]
    );
}

async function updateLastAccess(userId) {
    await pool.query(
        'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
    );
}

async function updateProfile(userId, fields, values) {
    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(userId);
    const idx = values.length;
    await pool.query(
        `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
    );
}

async function findSecret2FA(userId) {
    const result = await pool.query('SELECT secreto_2fa FROM usuarios WHERE id = $1', [userId]);
    return result.rows[0] || null;
}

async function update2FASecret(userId, secret) {
    await pool.query(
        'UPDATE usuarios SET secreto_2fa = $1, verificado_2fa = false WHERE id = $2',
        [secret, userId]
    );
}

async function verify2FA(userId) {
    await pool.query(
        'UPDATE usuarios SET verificado_2fa = true WHERE id = $1',
        [userId]
    );
}

async function findIdByEmail(email) {
    const result = await pool.query('SELECT id, nombre FROM usuarios WHERE email = $1', [email]);
    return result.rows[0] || null;
}

async function setResetToken(userId, token, expiration) {
    await pool.query(
        'UPDATE usuarios SET token_recuperacion = $1, expiracion_token_recuperacion = $2 WHERE id = $3',
        [token, expiration, userId]
    );
}

async function findByResetToken(token) {
    const result = await pool.query(
        'SELECT id FROM usuarios WHERE token_recuperacion = $1 AND expiracion_token_recuperacion > CURRENT_TIMESTAMP',
        [token]
    );
    return result.rows[0] || null;
}

async function updatePassword(userId, passwordHash) {
    await pool.query(
        'UPDATE usuarios SET password_hash = $1, token_recuperacion = NULL, expiracion_token_recuperacion = NULL, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, userId]
    );
}

async function findAll(page, size) {
    const offset = (page - 1) * size;
    const countResult = await pool.query('SELECT COUNT(*) FROM usuarios');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT id, email, nombre, apellido, telefono, tipo_usuario, foto_url,
                email_verificado, verificado_2fa, activo, ultimo_acceso, creado_en
         FROM usuarios ORDER BY creado_en DESC LIMIT $1 OFFSET $2`,
        [size, offset]
    );
    return { data: result.rows, total };
}

async function getStats() {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN tipo_usuario = 'propietario' THEN 1 END) as propietarios,
            COUNT(CASE WHEN tipo_usuario = 'arrendatario' THEN 1 END) as arrendatarios,
            COUNT(CASE WHEN tipo_usuario = 'admin' THEN 1 END) as admins,
            COUNT(CASE WHEN activo = false THEN 1 END) as inactivos,
            COUNT(CASE WHEN email_verificado = false THEN 1 END) as no_verificados
         FROM usuarios`
    );
    return result.rows[0];
}

async function softDelete(userId) {
    const result = await pool.query(
        `UPDATE usuarios SET activo = false, email = CONCAT('deleted-', id, '@rentamaq.com'), token_verificacion = NULL, token_recuperacion = NULL, expiracion_token_recuperacion = NULL, secreto_2fa = NULL, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND activo = true
         RETURNING id`,
        [userId]
    );
    return result.rows[0] || null;
}

async function setActive(userId, active) {
    const result = await pool.query(
        `UPDATE usuarios SET activo = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, email, nombre, apellido, telefono, tipo_usuario, foto_url, email_verificado, verificado_2fa, activo, ultimo_acceso, creado_en`,
        [active, userId]
    );
    return result.rows[0] || null;
}

async function findByVerificationToken(token) {
    const result = await pool.query(
        `SELECT id, email, nombre FROM usuarios WHERE token_verificacion = $1 AND email_verificado = false AND activo = true`,
        [token]
    );
    return result.rows[0] || null;
}

async function verifyEmail(userId) {
    const result = await pool.query(
        `UPDATE usuarios SET email_verificado = true, token_verificacion = NULL, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, email, nombre, apellido, telefono, tipo_usuario, foto_url, email_verificado, verificado_2fa, activo, ultimo_acceso, creado_en`,
        [userId]
    );
    return result.rows[0] || null;
}

module.exports = {
    findByEmail,
    findById,
    findByEmailWithPassword,
    findByIdWithPassword,
    insert,
    updateLastAccess,
    updateProfile,
    findSecret2FA,
    update2FASecret,
    verify2FA,
    findIdByEmail,
    setResetToken,
    findByResetToken,
    updatePassword,
    findAll,
    getStats,
    setActive,
    verifyEmail,
    findByVerificationToken,
    softDelete
};
