const pool = require('../db');

const PAGO_COLUMNS = `id, reserva_id, usuario_id, propietario_id, monto, metodo_pago,
    estado, referencia_pasarela, referencia_pasarela_mp, creado_en, actualizado_en`;

async function findReservaById(bookingId) {
    const result = await pool.query(
        `SELECT id, precio_total, maquinaria_id, propietario_id, arrendatario_id, fecha_inicio, fecha_fin, estado
         FROM reserva WHERE id = $1`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function findActivePaymentByBooking(bookingId) {
    const result = await pool.query(
        `SELECT id, estado FROM pago WHERE reserva_id = $1 AND estado IN ('pendiente', 'procesando', 'retenido')`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function insert({ id, bookingId, userId, propietarioId, monto, metodoPago, referenciaPasarela }) {
    await pool.query(
        `INSERT INTO pago (id, reserva_id, usuario_id, propietario_id, monto, metodo_pago, estado, referencia_pasarela)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7)`,
        [id, bookingId, userId, propietarioId, monto, metodoPago || 'tarjeta_credito', referenciaPasarela]
    );
}

async function findByReferenciaPasarela(referencia) {
    const result = await pool.query(
        'SELECT id, estado, reserva_id FROM pago WHERE referencia_pasarela = $1',
        [referencia]
    );
    return result.rows[0] || null;
}

async function updateEstado(id, estado) {
    await pool.query(
        'UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [estado, id]
    );
}

async function findByIdWithReserva(pagoId, userId) {
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago
         WHERE id = $1 AND (usuario_id = $2 OR propietario_id = $2)`,
        [pagoId, userId]
    );
    return result.rows[0] || null;
}

async function findByBooking(bookingId, userId) {
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago
         WHERE reserva_id = $1 AND (usuario_id = $2 OR propietario_id = $2)
         ORDER BY creado_en DESC`,
        [bookingId, userId]
    );
    return result.rows;
}

async function findByUser(userId) {
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago
         WHERE usuario_id = $1 OR propietario_id = $1
         ORDER BY creado_en DESC`,
        [userId]
    );
    return result.rows;
}

async function findByIdSimple(pagoId) {
    const result = await pool.query('SELECT id, usuario_id, propietario_id, referencia_pasarela_mp FROM pago WHERE id = $1', [pagoId]);
    return result.rows[0] || null;
}

async function updateReferenciaPasarela(id, mpPaymentId) {
    await pool.query(
        'UPDATE pago SET referencia_pasarela_mp = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [mpPaymentId, id]
    );
}

async function updateEstadoWhere(pagoId, estadoActual, nuevoEstado) {
    const result = await pool.query(
        `UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2 AND estado = $3 RETURNING ${PAGO_COLUMNS}`,
        [nuevoEstado, pagoId, estadoActual]
    );
    return result.rows[0] || null;
}

async function getDashboard() {
    const totals = await pool.query(
        `SELECT
           COUNT(*) as total_transacciones,
           COALESCE(SUM(CASE WHEN estado = 'liberado' THEN monto ELSE 0 END), 0) as total_liberado,
           COALESCE(SUM(CASE WHEN estado = 'retenido' THEN monto ELSE 0 END), 0) as total_retenido,
           COALESCE(SUM(CASE WHEN estado = 'reembolsado' THEN monto ELSE 0 END), 0) as total_reembolsado,
           COUNT(CASE WHEN estado = 'fallido' THEN 1 END) as total_fallidos
         FROM pago`
    );
    const ultimosPagos = await pool.query(`SELECT ${PAGO_COLUMNS} FROM pago ORDER BY creado_en DESC LIMIT 10`);
    return { resumen: totals.rows[0], ultimos_pagos: ultimosPagos.rows };
}

module.exports = {
    findReservaById, findActivePaymentByBooking, insert,
    findByReferenciaPasarela, updateEstado,
    findByIdWithReserva, findByBooking, findByUser, findByIdSimple, updateEstadoWhere, updateReferenciaPasarela,
    getDashboard
};
