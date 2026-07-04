const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { NotFoundError, ForbiddenError, ConflictError, ValidationError, eventBus, EVENT_TYPES } = require('shared');
const reservaRepository = require('../repositories/reservaRepository');

const MACHINERY_SERVICE_URL = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';

async function enviarNotificacion(userId, tipo, referenciaId, titulo, mensaje) {
    try {
        eventBus.publishEvent(tipo, {
            usuario_id: userId, tipo, titulo, mensaje,
            referencia_id: referenciaId, referencia_tipo: 'reserva'
        });
    } catch {
        console.warn('No se pudo enviar notificacion:', tipo);
    }
}

async function create(data, userId) {
    if (!data.maquinaria_id || !data.fecha_inicio || !data.fecha_fin) {
        throw new ValidationError('maquinaria_id, fecha_inicio y fecha_fin son requeridos');
    }

    const conflictos = await reservaRepository.findConflictingBookings(
        data.maquinaria_id, data.fecha_inicio, data.fecha_fin
    );

    if (conflictos.length > 0) {
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

    const booking = await reservaRepository.insert({
        id: uuidv4(), maquinariaId: data.maquinaria_id, userId,
        propietarioId: propietario_id, fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin, precioTotal
    });

    await enviarNotificacion(
        booking.propietario_id, EVENT_TYPES.BOOKING.CREATED, booking.id,
        'Nueva solicitud de reserva',
        `Has recibido una solicitud de reserva del ${booking.fecha_inicio} al ${booking.fecha_fin}`
    );

    return booking;
}

async function checkAvailability(machineryId, startDate, endDate) {
    if (!machineryId || !startDate || !endDate) {
        throw new ValidationError('machineryId, start y end son requeridos');
    }

    const conflictos = await reservaRepository.findConflictingBookings(machineryId, startDate, endDate);

    if (conflictos.length > 0) {
        return {
            disponible: false,
            fechas_no_disponibles: conflictos.map(r => ({ inicio: r.fecha_inicio, fin: r.fecha_fin }))
        };
    }

    return { disponible: true, fechas_no_disponibles: [] };
}

async function getById(id, userId) {
    const reserva = await reservaRepository.findById(id);
    if (!reserva) {
        throw new NotFoundError('Reserva no encontrada');
    }
    if (reserva.arrendatario_id !== userId && reserva.propietario_id !== userId) {
        throw new ForbiddenError('No tienes acceso a esta reserva');
    }
    return reserva;
}

async function getByUser(userId, page = 1, size = 20) {
    const { data, total } = await reservaRepository.findByUser(userId, page, size);
    return { data, total, page, size };
}

async function getByOwner(ownerId, page = 1, size = 20) {
    const { data, total } = await reservaRepository.findByOwner(ownerId, page, size);
    return { data, total, page, size };
}

async function confirm(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede confirmar la reserva');
    }
    if (reserva.estado !== 'pendiente') {
        throw new ValidationError('La reserva no está en estado pendiente');
    }

    const booking = await reservaRepository.updateEstado(id, 'confirmada');

    await enviarNotificacion(
        booking.arrendatario_id, EVENT_TYPES.BOOKING.CONFIRMED, booking.id,
        'Reserva confirmada',
        `Tu reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido confirmada`
    );

    return booking;
}

async function reject(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede rechazar la reserva');
    }
    if (reserva.estado !== 'pendiente') {
        throw new ValidationError('La reserva no está en estado pendiente');
    }

    const booking = await reservaRepository.updateEstado(id, 'rechazada');

    await enviarNotificacion(
        booking.arrendatario_id, EVENT_TYPES.BOOKING.REJECTED, booking.id,
        'Reserva rechazada',
        `Tu solicitud de reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido rechazada`
    );

    return booking;
}

async function cancel(id, userId, motivo) {
    const reserva = await getById(id, userId);
    if (reserva.estado === 'completada' || reserva.estado === 'cancelada') {
        throw new ValidationError('No se puede cancelar una reserva completada o ya cancelada');
    }

    const booking = await reservaRepository.cancel(id, motivo);

    await enviarNotificacion(
        booking.arrendatario_id === userId ? booking.propietario_id : booking.arrendatario_id,
        EVENT_TYPES.BOOKING.CANCELLED, booking.id,
        'Reserva cancelada',
        `La reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido cancelada. Motivo: ${booking.motivo_cancelacion}`
    );

    return booking;
}

async function complete(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede completar la reserva');
    }
    if (reserva.estado !== 'confirmada' && reserva.estado !== 'en_curso') {
        throw new ValidationError('La reserva no se puede completar en su estado actual');
    }

    const booking = await reservaRepository.updateEstado(id, 'completada');

    await enviarNotificacion(
        booking.arrendatario_id, EVENT_TYPES.BOOKING.COMPLETED, booking.id,
        'Reserva completada',
        `La reserva del ${booking.fecha_inicio} al ${booking.fecha_fin} ha sido completada. ¡Califica tu experiencia!`
    );

    return booking;
}

async function adminBookingStats() {
    return await reservaRepository.getAdminStats();
}

async function adminRecentBookings(limit = 10) {
    return await reservaRepository.findRecent(limit);
}

module.exports = {
    create, checkAvailability, getById, getByUser, getByOwner,
    confirm, reject, cancel, complete,
    adminBookingStats, adminRecentBookings
};
