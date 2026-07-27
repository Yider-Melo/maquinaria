const pool = require('../db');

const COLUMNS = 'id, usuario_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento, creado_en, actualizado_en';

async function findByUsuarioId(usuarioId) {
    const result = await pool.query(
        `SELECT ${COLUMNS} FROM cuentas_bancarias WHERE usuario_id = $1`,
        [usuarioId]
    );
    return result.rows[0] || null;
}

async function upsert(usuarioId, data) {
    const result = await pool.query(
        `INSERT INTO cuentas_bancarias (usuario_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (usuario_id)
         DO UPDATE SET banco = $2, tipo_cuenta = $3, numero_cuenta = $4, titular = $5, tipo_documento = $6, numero_documento = $7, actualizado_en = CURRENT_TIMESTAMP
         RETURNING ${COLUMNS}`,
        [usuarioId, data.banco, data.tipo_cuenta, data.numero_cuenta, data.titular, data.tipo_documento, data.numero_documento]
    );
    return result.rows[0];
}

async function remove(usuarioId) {
    await pool.query('DELETE FROM cuentas_bancarias WHERE usuario_id = $1', [usuarioId]);
}

module.exports = { findByUsuarioId, upsert, remove };