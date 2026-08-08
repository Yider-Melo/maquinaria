const pool = require('../db');

const PAGO_COLUMNS = `id, reserva_id, usuario_id, propietario_id, monto, metodo_pago,
    estado, referencia_pasarela, referencia_pasarela_mp, checkout_url, creado_en, actualizado_en`;

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
        `SELECT id, estado, referencia_pasarela, checkout_url FROM pago WHERE reserva_id = $1 AND estado IN ('pendiente', 'procesando', 'retenido')`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function updateCheckoutUrl(id, url) {
    await pool.query(
        'UPDATE pago SET checkout_url = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2',
        [url, id]
    );
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

async function findByUser(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM pago WHERE usuario_id = $1 OR propietario_id = $1`,
        [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS} FROM pago
         WHERE usuario_id = $1 OR propietario_id = $1
         ORDER BY creado_en DESC
         LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );
    return { data: result.rows, total };
}

async function findByMonth(mes, page = 1, size = 10) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM pago WHERE to_char(creado_en, 'YYYY-MM') = $1`,
        [mes]
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await pool.query(
        `SELECT ${PAGO_COLUMNS}, comision, monto_propietario, payout_estado
         FROM pago
         WHERE to_char(creado_en, 'YYYY-MM') = $1
         ORDER BY creado_en DESC
         LIMIT $2 OFFSET $3`,
        [mes, size, offset]
    );
    return { data: result.rows, total };
}

async function findByIdSimple(pagoId) {
    const result = await pool.query(
        `SELECT id, usuario_id, propietario_id, reserva_id, monto,
                comision, monto_propietario, referencia_pasarela_mp,
                payout_estado, payout_intentos
         FROM pago WHERE id = $1`,
        [pagoId]
    );
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

async function findPaymentByBooking(bookingId) {
    const result = await pool.query(
        `SELECT id, propietario_id, usuario_id, reserva_id,
                referencia_pasarela_mp, monto,
                comision, monto_propietario, payout_estado
         FROM pago
         WHERE reserva_id = $1 AND estado = 'retenido'
         ORDER BY creado_en DESC LIMIT 1`,
        [bookingId]
    );
    return result.rows[0] || null;
}

async function updatePayoutInfo(pagoId, { comision, montoPropietario, payoutEstado, payoutError }) {
    const result = await pool.query(
        `UPDATE pago SET
            comision = COALESCE($1, comision),
            monto_propietario = COALESCE($2, monto_propietario),
            payout_estado = COALESCE($3, payout_estado),
            payout_error = COALESCE($4, payout_error),
            payout_intentos = CASE WHEN $3 IS NOT NULL THEN payout_intentos + 1 ELSE payout_intentos END,
            actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING id`,
        [comision, montoPropietario, payoutEstado, payoutError, pagoId]
    );
    return result.rows[0] || null;
}

async function markPayoutCompleted(pagoId) {
    await pool.query(
        `UPDATE pago SET
            payout_estado = 'completado',
            payout_completado_en = CURRENT_TIMESTAMP,
            actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pagoId]
    );
}

async function insertMovimiento({ pagoId, reservaId, tipo, monto, descripcion, referenciaTipo, referenciaId }) {
    const result = await pool.query(
        `INSERT INTO movimiento (id, pago_id, reserva_id, tipo, monto, descripcion, referencia_tipo, referencia_id)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [pagoId, reservaId, tipo, monto, descripcion, referenciaTipo, referenciaId]
    );
    return result.rows[0];
}

async function markLiberado(pagoId) {
    await pool.query(
        `UPDATE pago SET
            estado = 'liberado',
            liberado_en = CURRENT_TIMESTAMP,
            actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND estado = 'retenido'`,
        [pagoId]
    );
}

async function findFailedPayouts() {
    const result = await pool.query(
        `SELECT id, reserva_id, propietario_id, monto, comision, monto_propietario,
                payout_estado, payout_intentos, payout_error, creado_en
         FROM pago
         WHERE payout_estado = 'fallido'
            OR (estado = 'liberado' AND payout_estado = 'pendiente')
         ORDER BY creado_en DESC`
    );
    return result.rows;
}

async function findPendingPayouts() {
    const result = await pool.query(
        `SELECT id, reserva_id, propietario_id, monto, comision, monto_propietario,
                payout_estado, payout_intentos, payout_error, creado_en
         FROM pago
         WHERE estado = 'liberado' AND (payout_estado IS NULL OR payout_estado IN ('pendiente', 'fallido'))
         ORDER BY creado_en DESC`
    );
    return result.rows;
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
    const comisiones = await pool.query(
        `SELECT
           COALESCE(SUM(comision), 0) as total_comisiones,
           COUNT(CASE WHEN comision > 0 THEN 1 END) as total_pagos_con_comision,
           COUNT(CASE WHEN payout_estado = 'fallido' THEN 1 END) as total_payouts_fallidos,
           COUNT(CASE WHEN payout_estado = 'pendiente' OR payout_estado IS NULL THEN 1 END) as total_payouts_pendientes
         FROM pago WHERE estado = 'liberado'`
    );
    const earnings = await pool.query(
        `SELECT COALESCE(SUM(monto), 0) as ganancia_total
         FROM movimiento WHERE tipo = 'comision_plataforma'`
    );
    const ultimosPagos = await pool.query(
        `SELECT ${PAGO_COLUMNS}, comision, monto_propietario, payout_estado
         FROM pago ORDER BY creado_en DESC LIMIT 10`
    );
    const porMes = await pool.query(
        `SELECT
           to_char(creado_en, 'YYYY-MM') as mes,
           COUNT(*) as total_transacciones,
           COALESCE(SUM(CASE WHEN estado = 'liberado' THEN monto ELSE 0 END), 0) as total_liberado,
           COALESCE(SUM(CASE WHEN estado = 'retenido' THEN monto ELSE 0 END), 0) as total_retenido,
           COALESCE(SUM(CASE WHEN estado = 'reembolsado' THEN monto ELSE 0 END), 0) as total_reembolsado,
           COUNT(CASE WHEN estado = 'fallido' THEN 1 END) as total_fallidos
         FROM pago
         GROUP BY mes
         ORDER BY mes DESC`
    );
    return {
        resumen: totals.rows[0],
        comisiones: comisiones.rows[0],
        ganancia_total: earnings.rows[0].ganancia_total,
        ultimos_pagos: ultimosPagos.rows,
        por_mes: porMes.rows
    };
}

module.exports = {
    findReservaById, findActivePaymentByBooking, insert,
    findByReferenciaPasarela, updateEstado, updateCheckoutUrl,
    findByIdWithReserva, findByBooking, findByUser, findByIdSimple,
    updateEstadoWhere, updateReferenciaPasarela, findPaymentByBooking,
    updatePayoutInfo, markPayoutCompleted, insertMovimiento,
    markLiberado, findFailedPayouts, findPendingPayouts, getDashboard,
    findByMonth
};
