const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { NotFoundError, ForbiddenError, ConflictError, ValidationError, eventBus, EVENT_TYPES } = require('shared');
const reservaRepository = require('../repositories/reservaRepository');
const createServiceLogger = require('../../../shared/logger');
const logger = createServiceLogger('booking-service');

const MACHINERY_SERVICE_URL = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';

const TZ = 'America/Bogota';

function datePartsInTZ(date) {
    const opts = { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const parts = new Intl.DateTimeFormat('es-CO', opts).formatToParts(date);
    const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
    return { year: get('year'), month: String(get('month')).padStart(2, '0'), day: String(get('day')).padStart(2, '0') };
}

function todayInTZ() {
    const { year, month, day } = datePartsInTZ(new Date());
    return `${year}-${month}-${day}`;
}

function toDateOnly(value) {
    return new Date(value).toISOString().slice(0, 10);
}

function minStartDate() {
    return todayInTZ();
}

function validateDateRange(startDate, endDate) {
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);
    if (start <= minStartDate()) throw new ValidationError('La fecha de inicio debe ser al menos 1 día después de hoy');
    if (end < start) throw new ValidationError('La fecha final no puede ser anterior a la fecha inicial');
    return { start, end };
}

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev';

async function enviarNotificacion(userId, tipo, referenciaId, titulo, mensaje) {
    const payload = { usuario_id: userId, tipo, titulo, mensaje, referencia_id: referenciaId, referencia_tipo: 'reserva' };
    try {
        await eventBus.publishEvent(tipo, payload);
    } catch {
        try {
            await axios.post(`${NOTIFICATION_SERVICE_URL}/internal`, payload, {
                headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' },
                timeout: 3000
            });
        } catch (err) {
            logger.warn('No se pudo enviar notificacion por HTTP', { tipo, error: err.message });
        }
    }
}

async function create(data, userId) {
    if (!data.maquinaria_id || !data.fecha_inicio || !data.fecha_fin) {
        throw new ValidationError('maquinaria_id, fecha_inicio y fecha_fin son requeridos');
    }

    const { start, end } = validateDateRange(data.fecha_inicio, data.fecha_fin);

    let propietario_id, precio_por_dia;
    try {
        const res = await axios.get(`${MACHINERY_SERVICE_URL}/${data.maquinaria_id}`);
        const maq = res.data.data;
        if (maq.disponible === false) {
            throw new ValidationError('La maquinaria no está disponible actualmente');
        }
        propietario_id = maq.propietario_id;
        precio_por_dia = parseFloat(maq.precio_por_dia);
    } catch (err) {
        if (err instanceof ValidationError) throw err;
        throw new NotFoundError('Maquinaria no encontrada');
    }

    if (propietario_id === userId) {
        throw new ValidationError('No puedes alquilar tu propia maquinaria');
    }

    const fechaInicio = new Date(start);
    const fechaFin = new Date(end);
    const dias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
    if (dias <= 0) throw new ValidationError('El rango de fechas no es válido');

    const precioUnitario = parseFloat(precio_por_dia);
    const precioTotal = dias * precioUnitario;

    const booking = await reservaRepository.withTransaction(async (client) => {
        const conflictos = await reservaRepository.findConflictingBookings(data.maquinaria_id, start, end, client);
        if (conflictos.length > 0) {
            throw new ConflictError('La maquinaria no está disponible en las fechas seleccionadas');
        }

        const b = await reservaRepository.insert({
            id: uuidv4(), maquinariaId: data.maquinaria_id, userId,
            propietarioId: propietario_id, fechaInicio: start,
            fechaFin: end, precioUnitario, precioTotal
        }, client);

        await enviarNotificacion(
            b.propietario_id, EVENT_TYPES.BOOKING.CREATED, b.id,
            'Nueva solicitud de reserva',
            `Recibiste una nueva solicitud de reserva`
        );

        return b;
    });

    return booking;
}

async function checkAvailability(machineryId, startDate, endDate) {
    if (!machineryId || !startDate || !endDate) {
        throw new ValidationError('machineryId, start y end son requeridos');
    }

    const { start, end } = validateDateRange(startDate, endDate);

    const conflictos = await reservaRepository.findConflictingBookings(machineryId, start, end);

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
    try {
        const res = await axios.get(`${AUTH_SERVICE_URL}/users/${reserva.arrendatario_id}`, {
            headers: { 'x-api-key': process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev' }
        });
        const user = res.data?.data;
        if (user) {
            reserva.arrendatario_nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim() || reserva.arrendatario_nombre;
            reserva.arrendatario_telefono = user.telefono;
            reserva.arrendatario_email = user.email;
        }
    } catch { }
    try {
        const res = await axios.get(`${AUTH_SERVICE_URL}/users/${reserva.propietario_id}`, {
            headers: { 'x-api-key': process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev' }
        });
        const user = res.data?.data;
        if (user) {
            reserva.propietario_nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim() || reserva.propietario_nombre;
        }
    } catch { }
    return reserva;
}

async function getOccupiedDates(machineryId, startDate, endDate) {
    if (!machineryId || !startDate || !endDate) {
        throw new ValidationError('machineryId, start y end son requeridos');
    }
    const start = toDateOnly(startDate);
    const end = toDateOnly(endDate);
    const ranges = await reservaRepository.findOccupiedRanges(machineryId, start, end);
    const dates = new Set();
    for (const range of ranges) {
        const current = new Date(range.fecha_inicio);
        const end = new Date(range.fecha_fin);
        while (current <= end) {
            dates.add(current.toISOString().slice(0, 10));
            current.setDate(current.getDate() + 1);
        }
    }
    return { ranges, dates: Array.from(dates).sort() };
}

async function getInternalById(id) {
    const reserva = await reservaRepository.findById(id);
    if (!reserva) {
        throw new NotFoundError('Reserva no encontrada');
    }
    return reserva;
}

async function getByUser(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await reservaRepository.findByUser(userId, page, size);
    const enriched = await Promise.all(data.map(b => enrichBookingWithUsers(b)));
    return { data: enriched, total, page, size };
}

async function getByOwner(ownerId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await reservaRepository.findByOwner(ownerId, page, size);
    const enriched = await Promise.all(data.map(b => enrichBookingWithUsers(b)));
    return { data: enriched, total, page, size };
}

async function enrichBookingWithUsers(reserva) {
    try {
        const res = await axios.get(`${AUTH_SERVICE_URL}/users/${reserva.arrendatario_id}`, {
            headers: { 'x-api-key': process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev' },
            timeout: 2000
        });
        const user = res.data?.data;
        if (user) {
            reserva.arrendatario_nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();
            reserva.arrendatario_telefono = user.telefono;
            reserva.arrendatario_email = user.email;
        }
    } catch { }
    return reserva;
}

async function confirm(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede confirmar la reserva');
    }
    if (reserva.estado !== 'pendiente') {
        throw new ValidationError('La reserva no está en estado pendiente');
    }

    return await reservaRepository.withTransaction(async (client) => {
        const booking = await reservaRepository.updateEstado(id, 'confirmada', client);

        await enviarNotificacion(
            booking.arrendatario_id, EVENT_TYPES.BOOKING.CONFIRMED, booking.id,
            'Reserva confirmada',
            `Tu reserva ha sido confirmada por el propietario`
        );

        return booking;
    });
}

async function reject(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede rechazar la reserva');
    }
    if (reserva.estado !== 'pendiente') {
        throw new ValidationError('La reserva no está en estado pendiente');
    }

    return await reservaRepository.withTransaction(async (client) => {
        const booking = await reservaRepository.updateEstado(id, 'rechazada', client);

        await enviarNotificacion(
            booking.arrendatario_id, EVENT_TYPES.BOOKING.REJECTED, booking.id,
            'Reserva rechazada',
            `Tu solicitud de reserva ha sido rechazada`
        );

        return booking;
    });
}

async function cancel(id, userId, motivo) {
    const reserva = await getById(id, userId);
    if (reserva.estado === 'completada' || reserva.estado === 'cancelada') {
        throw new ValidationError('No se puede cancelar una reserva completada o ya cancelada');
    }

    return await reservaRepository.withTransaction(async (client) => {
        const booking = await reservaRepository.cancel(id, motivo, client);

        await enviarNotificacion(
            booking.arrendatario_id === userId ? booking.propietario_id : booking.arrendatario_id,
            EVENT_TYPES.BOOKING.CANCELLED, booking.id,
            'Reserva cancelada',
            `La reserva ha sido cancelada. Motivo: ${booking.motivo_cancelacion}`
        );

        return booking;
    });
}

async function releasePayment(bookingId) {
    const url = `${PAYMENT_SERVICE_URL}/internal/booking/${bookingId}/release`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' }
        });
        const body = await response.text();
        if (!response.ok) {
            logger.warn('No se pudo liberar el pago automáticamente:', { status: response.status, bookingId });
        } else {
            logger.info('Pago liberado automáticamente al completar reserva:', { bookingId });
        }
    } catch (err) {
        logger.warn('Error al liberar pago automático:', { message: err.message, bookingId });
    }
}

async function complete(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.estado !== 'pagada' && reserva.estado !== 'en_curso') {
        throw new ValidationError('La reserva debe estar pagada o en curso para completarse');
    }

    return await reservaRepository.withTransaction(async (client) => {
        const booking = await reservaRepository.updateEstado(id, 'completada', client);

        await enviarNotificacion(
            booking.arrendatario_id === userId ? booking.propietario_id : booking.arrendatario_id,
            EVENT_TYPES.BOOKING.COMPLETED, booking.id,
            'Reserva completada',
            `La reserva ha sido completada. ¡Califica tu experiencia!`
        );

        setImmediate(() => releasePayment(id));

        return booking;
    });
}

async function startRental(id, userId) {
    const reserva = await getById(id, userId);
    if (reserva.propietario_id !== userId) {
        throw new ForbiddenError('Solo el propietario puede iniciar el periodo de alquiler');
    }
    if (reserva.estado !== 'pagada') {
        throw new ValidationError('La reserva debe estar pagada para iniciar el periodo de alquiler');
    }

    return await reservaRepository.withTransaction(async (client) => {
        const booking = await reservaRepository.updateEstado(id, 'en_curso', client);

        await enviarNotificacion(
            booking.arrendatario_id, EVENT_TYPES.BOOKING.STARTED, booking.id,
            'Alquiler en curso',
            `El periodo de alquiler ha comenzado`
        );

        return booking;
    });
}

async function markAsPaid(id) {
    const reserva = await reservaRepository.findById(id);
    if (!reserva) throw new NotFoundError('Reserva no encontrada');
    if (reserva.estado !== 'confirmada') {
        throw new ValidationError('La reserva debe estar confirmada para marcarla como pagada');
    }
    return await reservaRepository.withTransaction(async (client) => {
        const booking = await reservaRepository.updateEstado(id, 'pagada', client);
        await enviarNotificacion(
            booking.propietario_id, EVENT_TYPES.PAYMENT.CONFIRMED, booking.id,
            'Pago recibido',
            `El arrendatario ha pagado la reserva`
        );
        return booking;
    });
}

async function adminBookingStats() {
    return await reservaRepository.getAdminStats();
}

async function adminRecentBookings(limit = 10) {
    return await reservaRepository.findRecent(limit);
}

module.exports = {
    create, checkAvailability, getOccupiedDates, getById, getInternalById, getByUser, getByOwner,
    confirm, reject, cancel, startRental, complete, markAsPaid,
    adminBookingStats, adminRecentBookings
};
