const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

async function create(usuarioId, token, expiraEn) {
    const id = uuidv4();
    await pool.query(
        `INSERT INTO refresh_tokens (id, usuario_id, token, expira_en)
         VALUES ($1, $2, $3, $4)`,
        [id, usuarioId, token, expiraEn]
    );
    return { id, token, expiraEn };
}

async function findByToken(token) {
    const result = await pool.query(
        `SELECT rt.*, u.activo FROM refresh_tokens rt
         JOIN usuarios u ON u.id = rt.usuario_id
         WHERE rt.token = $1 AND rt.revocado = false AND rt.expira_en > CURRENT_TIMESTAMP`,
        [token]
    );
    return result.rows[0] || null;
}

async function revoke(token) {
    await pool.query(
        'UPDATE refresh_tokens SET revocado = true WHERE token = $1',
        [token]
    );
}

async function revokeAllByUser(usuarioId) {
    await pool.query(
        'UPDATE refresh_tokens SET revocado = true WHERE usuario_id = $1 AND revocado = false',
        [usuarioId]
    );
}

async function findActivoById(userId) {
    const result = await pool.query(
        'SELECT activo FROM usuarios WHERE id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

module.exports = {
    create, findByToken, revoke, revokeAllByUser, findActivoById
};