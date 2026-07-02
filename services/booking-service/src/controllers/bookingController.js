// Controlador de reservas.
// Maneja el ciclo de vida completo de las reservas: creacion, verificacion
// de disponibilidad, confirmacion, rechazo, cancelacion y finalizacion.
// Publica eventos a RabbitMQ y notifica a los involucrados via el bus de eventos.

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const pool = require('../db');
const { NotFoundError, ForbiddenError, ConflictError, ValidationError, AppError, eventBus, EVENT_TYPES } = require('shared');

const MACHINERY_SERVICE_URL = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';

// Envia una notificacion a un usuario publicando un evento en RabbitMQ.
async function enviarNotificacion(userId, tipo, referenciaId, titulo, mensaje) {
    try {
        eventBus.publishEvent(tipo, {
            usuario_id: userId,
            tipo,
            titulo,
            mensaje,
            referencia_id: referenciaId,
            referencia_tipo: 'reserva'
        });
    } catch {
        console.warn('No se pudo enviar notificacion:', tipo);
    }
}

// Crea una nueva reserva. Verifica disponibilidad, consulta maquinaria al
// servicio de maquinaria, calcula precio total segun los dias y notifica al propietario.
async function create(data, userId) {
    if (!data.maquinaria_id || !data.fecha_inicio || !data.fecha_fin) {
        throw new ValidationError('maquinaria_id, fecha_inicio y fecha_fin son requeridos');
    }

    const disponibilidad = await checkAvailability(
        data.maquinaria_id, data.fecha_inicio, data.fecha_fin
    );

    if (!disponibilidad.disponible) {
        throw new ConflictError('La maquinaria no está disponible en las fechas seleccionadas');
    }

    let propietario_id, precio_por_dia;
    try {
        const res = await axios.get(`${MACHINERY_SERVICE_URL}/${data.maquinaria_id}`);
        const maq = res.data.data;
        propietario_id = maq.propietario_id;
        precio_por_dia = parseFloat(maq.precio_por_dia);
    } catch {
        throw new NotFoundError('Maquinaria no encontrada');
    }

    if (propietario_id === userId) {
        throw new ValidationError('No puedes alquilar tu propia maquinaria');
    }

    const fechaInicio = new Date(data.fecha_inicio);
    const fechaFin = new Date(data.fecha_fin);
    const dias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    const precioTotal = dias * parseFloat(precio_por_dia);

    const id = uuidv4();
    const result = await pool.query(
        `INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente')
         RETURNING *`,
        [id, data.maquinaria_id, userId, propietario_id, data.fecha_inicio, data.fecha_fin, precioTotal]
    );

    const booking = result.rows[0];
    await enviarNotificacion(
        booking.propietario_id,
        EVENT_TYPES.BOOKING.CREATED,
        booking.id,
        'Nueva solicitud de reserva',
        `Has recibido una solicitud de reserva del ${booking.fecha_inicio} al ${booking.fecha_fin}`
    );

    return booking;
}

// Verifica si una maquinaria esta disponible en un rango de fechas
// consultando reservas existentes con overlapping de fechas.
async function checkAvailability(machineryId, startDate, endDate) {
    if (!machineryId || !startDate || !endDate) {
        throw new ValidationError('machineryId, start y end son requeridos');
    }

    const result = await pool.query(
        `SELECT fecha_inicio, fecha_fin FROM reserva
         WHERE maquinaria_id = $1
           AND estado IN ('pendiente', 'confirmada', 'en_curso')
           AND (fecha_inicio, fecha_fin) OVERLAPS ($2::date, $3::date)`,
        [machineryId, startDate, endDate]
    );

    if (result.rows.length > 0) {
        return {
            disponible: false,
            fechas_no_disponibles: result.rows.map(r => ({
                inicio: r.fecha_inicio,
                fin: r.fecha_fin
            }))
        };
    }

    return { disponible: true, fechas_no_disponibles: [] };
}

// Obtiene una reserva por ID, verificando que el usuario sea parte de ella.
async function getById(id, userId) {
    const result = await pool.query(
        `SELECT * FROM reserva WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Reserva no encontrada');
    }

    const reserva = result.rows[0];
    if (reserva.arrendatario_id !== userId && reserva.propietario_id !== userId) {
        throw new ForbiddenError('No tienes acceso a esta reserva');
    }

    return reserva;
}

// Lista reservas de un arrendatario con paginacion.
async function getByUser(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM reserva WHERE arrendatario_id = $1',
        [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
        `SELECT * FROM reserva WHERE arrendatario_id = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );

    return { data: result.rows, total, page, size };
}

// Lista reservas de un propietario (maquinaria propia) con paginacion.
async function getByOwner(ownerId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM reserva WHERE propietario_id = $1',
        [ownerId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
        `SELECT * FROM reserva WHERE propietario_id = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [ownerId, size, offset]
    );

    return { data: result.rows, total, page, size };
}

// Confirma una reserva en estado pendiente. Solo el propietario puede hacerlo.
async function confirm(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede confirmar la reserva');
    }
    if (reserva.estado !== 'pendiente') {
        throw new ValidationError('La reserva no está en estado pendiente');
    }

    const result = await pool.query(
        `UPDATE reserva SET estado = 'confirmada', actualizado_en = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
    );

    const booking = result.rows[0];
    await enviarNotificacion(
        booking.arrendatario_id,
        EVENT_TYPES.BOOKING.CONFIRMED,
        booking.id,
        'Reserva confirmada',
        `Tu reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido confirmada`
    );

    return booking;
}

// Rechaza una reserva en estado pendiente. Solo el propietario puede hacerlo.
async function reject(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede rechazar la reserva');
    }
    if (reserva.estado !== 'pendiente') {
        throw new ValidationError('La reserva no está en estado pendiente');
    }

    const result = await pool.query(
        `UPDATE reserva SET estado = 'rechazada', actualizado_en = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
    );

    const booking = result.rows[0];
    await enviarNotificacion(
        booking.arrendatario_id,
        EVENT_TYPES.BOOKING.REJECTED,
        booking.id,
        'Reserva rechazada',
        `Tu solicitud de reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido rechazada`
    );

    return booking;
}

// Cancela una reserva. Cualquiera de las partes puede cancelar,
// excepto si ya esta completada o cancelada. Notifica a la otra parte.
async function cancel(id, userId, motivo) {
    const reserva = await getById(id, userId);

    if (reserva.estado === 'completada' || reserva.estado === 'cancelada') {
        throw new ValidationError('No se puede cancelar una reserva completada o ya cancelada');
    }

    const result = await pool.query(
        `UPDATE reserva SET estado = 'cancelada', motivo_cancelacion = $2, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, motivo || 'Cancelado por el usuario']
    );

    const booking = result.rows[0];
    await enviarNotificacion(
        booking.arrendatario_id === userId ? booking.propietario_id : booking.arrendatario_id,
        EVENT_TYPES.BOOKING.CANCELLED,
        booking.id,
        'Reserva cancelada',
        `La reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido cancelada. Motivo: ${booking.motivo_cancelacion}`
    );

    return booking;
}

// Completa una reserva. Solo el propietario puede hacerlo.
// La reserva debe estar en estado confirmada o en_curso.
async function complete(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede completar la reserva');
    }
    if (reserva.estado !== 'confirmada' && reserva.estado !== 'en_curso') {
        throw new ValidationError('La reserva no se puede completar en su estado actual');
    }

    const result = await pool.query(
        `UPDATE reserva SET estado = 'completada', actualizado_en = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
    );

    const booking = result.rows[0];
    await enviarNotificacion(
        booking.arrendatario_id,
        EVENT_TYPES.BOOKING.COMPLETED,
        booking.id,
        'Reserva completada',
        `La reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido completada. ¡Califica tu experiencia!`
    );

    return booking;
}

async function adminBookingStats() {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
            COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as confirmadas,
            COUNT(CASE WHEN estado = 'en_curso' THEN 1 END) as en_curso,
            COUNT(CASE WHEN estado = 'completada' THEN 1 END) as completadas,
            COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas,
            COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
            COALESCE(SUM(precio_total), 0) as ingresos_totales,
            COALESCE(AVG(precio_total), 0) as promedio_por_reserva
         FROM reserva`
    );
    return result.rows[0];
}

async function adminRecentBookings(limit = 10) {
    const result = await pool.query(
        `SELECT * FROM reserva ORDER BY creado_en DESC LIMIT $1`,
        [limit]
    );
    return result.rows;
}

module.exports = {
    create,
    checkAvailability,
    getById,
    getByUser,
    getByOwner,
    confirm,
    reject,
    cancel,
    complete,
    adminBookingStats,
    adminRecentBookings
};
