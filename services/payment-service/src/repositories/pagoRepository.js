const pool = require('../db');

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

async function insert({ id, bookingId, userId, monto, metodoPago, referenciaPasarela }) {
    await pool.query(
        `INSERT INTO pago (id, reserva_id, usuario_id, monto, metodo_pago, estado, referencia_pasarela)
         VALUES ($1, $2, $3, $4, $5, 'pendiente', $6)`,
        [id, bookingId, userId, monto, metodoPago || 'tarjeta_credito', referenciaPasarela]
    );
}

async function findByReferenciaPasarela(referencia) {
    const result = await pool.query(
        'SELECT id, estado FROM pago WHERE referencia_pasarela = $1',
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
        `SELECT p.*, r.maquinaria_id, r.fecha_inicio, r.fecha_fin
         FROM pago p JOIN reserva r ON p.reserva_id = r.id
         WHERE p.id = $1 AND (r.arrendatario_id = $2 OR r.propietario_id = $2)`,
        [pagoId, userId]
    );
    return result.rows[0] || null;
}

async function findByBooking(bookingId, userId) {
    const result = await pool.query(
        `SELECT p.* FROM pago p
         JOIN reserva r ON p.reserva_id = r.id
         WHERE p.reserva_id = $1 AND (r.arrendatario_id = $2 OR r.propietario_id = $2)
         ORDER BY p.creado_en DESC`,
        [bookingId, userId]
    );
    return result.rows;
}

async function findByIdSimple(pagoId) {
    const result = await pool.query('SELECT usuario_id FROM pago WHERE id = $1', [pagoId]);
    return result.rows[0] || null;
}

async function updateEstadoWhere(pagoId, estadoActual, nuevoEstado) {
    const result = await pool.query(
        `UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2 AND estado = $3 RETURNING *`,
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
    const ultimosPagos = await pool.query('SELECT * FROM pago ORDER BY creado_en DESC LIMIT 10');
    return { resumen: totals.rows[0], ultimos_pagos: ultimosPagos.rows };
}

module.exports = {
    findReservaById, findActivePaymentByBooking, insert,
    findByReferenciaPasarela, updateEstado,
    findByIdWithReserva, findByBooking, findByIdSimple, updateEstadoWhere,
    getDashboard
};
