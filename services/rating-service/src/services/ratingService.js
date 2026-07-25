const { v4: uuidv4 } = require('uuid');
const { ConflictError, ValidationError, NotFoundError, ForbiddenError } = require('shared');
const calificacionRepository = require('../repositories/calificacionRepository');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const MACHINERY_SERVICE_URL = process.env.MACHINERY_SERVICE_URL || 'http://localhost:3002';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'rentamaq-internal-key-dev';

async function fetchUser(userId) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${AUTH_SERVICE_URL}/users/${userId}`, {
            headers: { 'x-api-key': INTERNAL_API_KEY },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const body = await res.json();
        const u = body.data;
        if (!u) return null;
        return { nombre: u.nombre || '', apellido: u.apellido || '', email: u.email };
    } catch { return null; }
}

async function fetchMachinery(machineryId) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${MACHINERY_SERVICE_URL}/${machineryId}`, {
            headers: { 'x-api-key': INTERNAL_API_KEY },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const body = await res.json();
        const m = body.data;
        return m ? { titulo: m.titulo } : null;
    } catch { return null; }
}

async function enrichRating(rating) {
    if (!rating) return rating;
    const [calificador, calificado, maquinaria] = await Promise.all([
        fetchUser(rating.calificador_id),
        fetchUser(rating.calificado_id),
        fetchMachinery(rating.maquinaria_id)
    ]);
    return {
        ...rating,
        calificador_nombre: calificador ? `${calificador.nombre} ${calificador.apellido}`.trim() : null,
        calificador_email: calificador?.email || null,
        calificado_nombre: calificado ? `${calificado.nombre} ${calificado.apellido}`.trim() : null,
        calificado_email: calificado?.email || null,
        maquinaria_titulo: maquinaria?.titulo || null
    };
}

async function enrichRatings(ratings) {
    return Promise.all(ratings.map(enrichRating));
}

async function create(data, userId) {
    if (!data.reserva_id || !data.maquinaria_id || !data.calificado_id || !data.puntuacion) {
        throw new ValidationError('reserva_id, maquinaria_id, calificado_id y puntuacion son requeridos');
    }

    const existing = await calificacionRepository.findByReservaAndCalificador(data.reserva_id, userId);
    if (existing) {
        throw new ConflictError('Ya calificaste esta reserva');
    }

    if (data.calificado_id === userId) {
        throw new ValidationError('No puedes calificarte a ti mismo');
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${BOOKING_SERVICE_URL}/internal/${data.reserva_id}`, {
            headers: { 'x-api-key': INTERNAL_API_KEY },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status === 404) throw new NotFoundError('Reserva no encontrada');
        if (!response.ok) throw new Error('Error al verificar la reserva');
        const body = await response.json();
        const reserva = body.data;
        if (reserva.estado !== 'completada' && reserva.estado !== 'pagada') {
            throw new ValidationError('Solo se pueden calificar reservas completadas');
        }
        if (reserva.arrendatario_id !== userId && reserva.propietario_id !== userId) {
            throw new ForbiddenError('Solo los participantes de la reserva pueden calificar');
        }
    } catch (err) {
        if (err instanceof ValidationError || err instanceof NotFoundError || err instanceof ForbiddenError) throw err;
        throw new Error('Error de conexión al servicio de reservas');
    }

    return await calificacionRepository.insert({
        id: uuidv4(), reservaId: data.reserva_id, maquinariaId: data.maquinaria_id,
        calificadorId: userId, calificadoId: data.calificado_id,
        puntuacion: data.puntuacion, puntuacion_maquinaria: data.puntuacion_maquinaria, comentario: data.comentario
    });
}

async function getByUser(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await calificacionRepository.findByCalificado(userId, page, size);
    return { data: await enrichRatings(data), total, page, size };
}

async function getMyRatings(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await calificacionRepository.findByCalificador(userId, page, size);
    return { data: await enrichRatings(data), total, page, size };
}

async function getByMachinery(machineryId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await calificacionRepository.findByMaquinaria(machineryId, page, size);
    return { data: await enrichRatings(data), total, page, size };
}

async function getAverage(userId) {
    return await calificacionRepository.getAverage(userId);
}

async function getById(id) {
    const rating = await calificacionRepository.findById(id);
    if (!rating) throw new NotFoundError('Calificación no encontrada');
    return await enrichRating(rating);
}

async function update(id, data, userId) {
    const existing = await calificacionRepository.findById(id);
    if (!existing) {
        throw new NotFoundError('Calificación no encontrada');
    }
    if (existing.calificador_id !== userId) {
        throw new ForbiddenError('No puedes editar una calificación que no hiciste');
    }
    if (existing.editado) {
        throw new ValidationError('Esta calificación ya fue editada. Solo se permite editar una vez.');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (data.puntuacion) { fields.push(`puntuacion = $${idx++}`); values.push(data.puntuacion); }
    if (data.puntuacion_maquinaria !== undefined) { fields.push(`puntuacion_maquinaria = $${idx++}`); values.push(data.puntuacion_maquinaria); }
    if (data.comentario !== undefined) { fields.push(`comentario = $${idx++}`); values.push(data.comentario); }

    if (fields.length === 0) return existing;

    const updated = await calificacionRepository.update(id, fields, values);
    await calificacionRepository.markAsEdited(id);
    return updated;
}

async function remove(id, userId) {
    const existing = await calificacionRepository.findById(id);
    if (!existing) {
        throw new NotFoundError('Calificación no encontrada');
    }
    if (existing.calificador_id !== userId) {
        throw new ForbiddenError('No puedes eliminar una calificación que no hiciste');
    }

    await calificacionRepository.softDelete(id);
    return { message: 'Calificación eliminada' };
}

async function report(id, userId, motivo) {
    const result = await calificacionRepository.report(id, motivo);
    if (!result) {
        throw new NotFoundError('Calificación no encontrada');
    }
    return result;
}

async function adminRatingStats() {
    return await calificacionRepository.getAdminStats();
}

module.exports = {
    create, getById, getByUser, getMyRatings, getByMachinery, getAverage,
    update, remove, report, adminRatingStats
};
