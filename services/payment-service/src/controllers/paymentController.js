// Controlador de pagos.
// Maneja la creacion de checkout, procesamiento de webhooks de pasarela,
// consulta de pagos, liberacion de fondos al propietario, reembolsos
// y dashboard administrativo con metricas financieras.

const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { NotFoundError, ForbiddenError, ValidationError } = require('shared');

// Inicia el proceso de pago para una reserva. Verifica que la reserva exista,
// pertenezca al usuario y este confirmada. Retorna el pago existente si ya hay uno activo.
async function createCheckout(bookingId, userId, metodoPago) {
    const data = await pool.query(
        `SELECT id, precio_total, maquinaria_id, propietario_id, arrendatario_id, fecha_inicio, fecha_fin, estado
         FROM reserva WHERE id = $1`,
        [bookingId]
    );

    if (data.rows.length === 0) {
        throw new NotFoundError('Reserva no encontrada');
    }

    const reserva = data.rows[0];
    if (reserva.arrendatario_id !== userId) {
        throw new ForbiddenError('Solo el arrendatario puede iniciar el pago');
    }

    if (reserva.estado !== 'confirmada') {
        throw new ValidationError('La reserva debe estar confirmada para procesar el pago');
    }

    // Si ya existe un pago activo, lo retorna en lugar de crear uno nuevo
    const existingPayment = await pool.query(
        `SELECT id, estado FROM pago WHERE reserva_id = $1 AND estado IN ('pendiente', 'procesando', 'retenido')`,
        [bookingId]
    );

    if (existingPayment.rows.length > 0) {
        return { pago_id: existingPayment.rows[0].id, estado: existingPayment.rows[0].estado };
    }

    const id = uuidv4();
    const referenciaPasarela = `RENTAMAQ-${id.substring(0, 8).toUpperCase()}`;

    await pool.query(
        `INSERT INTO pago (id, reserva_id, usuario_id, monto, metodo_pago, estado, referencia_pasarela)
         VALUES ($1, $2, $3, $4, $5, 'pendiente', $6)`,
        [id, bookingId, userId, reserva.precio_total, metodoPago || 'tarjeta_credito', referenciaPasarela]
    );

    return {
        pago_id: id,
        referencia: referenciaPasarela,
        monto: reserva.precio_total,
        estado: 'pendiente'
    };
}

// Procesa notificaciones webhook de la pasarela de pagos.
// Actualiza el estado del pago segun el status recibido.
async function handleWebhook(payload) {
    const action = payload.action || payload.type;
    const pagoId = payload.data?.id;

    if (!pagoId) return { message: 'Payload invalido' };

    if (action === 'payment.created' || action === 'payment.updated' || action === 'payment') {

        const result = await pool.query(
            `SELECT id, estado FROM pago WHERE referencia_pasarela = $1`,
            [pagoId]
        );

        if (result.rows.length === 0) return { message: 'Pago no encontrado' };

        const pago = result.rows[0];
        const nuevoEstado = determinarEstado(payload.data?.status || payload.status);

        await pool.query(
            `UPDATE pago SET estado = $1, actualizado_en = CURRENT_TIMESTAMP WHERE id = $2`,
            [nuevoEstado, pago.id]
        );

        return { message: 'Webhook procesado', estado: nuevoEstado };
    }
}

// Mapea el status de la pasarela de pagos al estado interno del sistema.
function determinarEstado(status) {
    const map = {
        approved: 'retenido',
        authorized: 'retenido',
        in_process: 'procesando',
        in_mediation: 'procesando',
        rejected: 'fallido',
        cancelled: 'fallido',
        refunded: 'reembolsado',
        charged_back: 'reembolsado'
    };
    return map[status] || 'procesando';
}

// Obtiene un pago por ID, verificando que el usuario sea parte de la reserva asociada.
async function getPaymentById(pagoId, userId) {
    const result = await pool.query(
        `SELECT p.*, r.maquinaria_id, r.fecha_inicio, r.fecha_fin
         FROM pago p JOIN reserva r ON p.reserva_id = r.id
         WHERE p.id = $1 AND (r.arrendatario_id = $2 OR r.propietario_id = $2)`,
        [pagoId, userId]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Pago no encontrado');
    }

    return result.rows[0];
}

// Obtiene todos los pagos asociados a una reserva.
// Verifica que el usuario sea parte de la reserva.
async function getPaymentsByBooking(bookingId, userId) {
    const result = await pool.query(
        `SELECT p.* FROM pago p
         JOIN reserva r ON p.reserva_id = r.id
         WHERE p.reserva_id = $1 AND (r.arrendatario_id = $2 OR r.propietario_id = $2)
         ORDER BY p.creado_en DESC`,
        [bookingId, userId]
    );
    return result.rows;
}

// Libera fondos retenidos al propietario (cambia estado a liberado).
async function releaseFunds(pagoId) {
    const pago = await pool.query('SELECT usuario_id FROM pago WHERE id = $1', [pagoId]);
    if (pago.rows.length === 0) throw new NotFoundError('Pago no encontrado');

    const result = await pool.query(
        `UPDATE pago SET estado = 'liberado', actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND estado = 'retenido' RETURNING *`,
        [pagoId]
    );

    return result.rows[0] || { message: 'Pago no encontrado o no está en estado retenido' };
}

// Reembolsa un pago retenido (cambia estado a reembolsado).
async function refund(pagoId) {
    const pago = await pool.query('SELECT usuario_id FROM pago WHERE id = $1', [pagoId]);
    if (pago.rows.length === 0) throw new NotFoundError('Pago no encontrado');

    const result = await pool.query(
        `UPDATE pago SET estado = 'reembolsado', actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND estado = 'retenido' RETURNING *`,
        [pagoId]
    );

    return result.rows[0] || { message: 'Pago no encontrado o no reembolsable' };
}

// Obtiene metricas del dashboard: totales por estado y ultimos 10 pagos.
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

    const ultimosPagos = await pool.query(
        `SELECT * FROM pago ORDER BY creado_en DESC LIMIT 10`
    );

    return { resumen: totals.rows[0], ultimos_pagos: ultimosPagos.rows };
}

module.exports = {
    createCheckout,
    handleWebhook,
    determinarEstado,
    getPaymentById,
    getPaymentsByBooking,
    releaseFunds,
    refund,
    getDashboard
};
