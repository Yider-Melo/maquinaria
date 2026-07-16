const { v4: uuidv4 } = require('uuid');
const { ConflictError, ValidationError, NotFoundError, ForbiddenError } = require('shared');
const calificacionRepository = require('../repositories/calificacionRepository');

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

    return await calificacionRepository.insert({
        id: uuidv4(), reservaId: data.reserva_id, maquinariaId: data.maquinaria_id,
        calificadorId: userId, calificadoId: data.calificado_id,
        puntuacion: data.puntuacion, puntuacion_maquinaria: data.puntuacion_maquinaria, comentario: data.comentario
    });
}

async function getByUser(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await calificacionRepository.findByCalificado(userId, page, size);
    return { data, total, page, size };
}

async function getMyRatings(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await calificacionRepository.findByCalificador(userId, page, size);
    return { data, total, page, size };
}

async function getByMachinery(machineryId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await calificacionRepository.findByMaquinaria(machineryId, page, size);
    return { data, total, page, size };
}

async function getAverage(userId) {
    return await calificacionRepository.getAverage(userId);
}

async function update(id, data, userId) {
    const existing = await calificacionRepository.findById(id);
    if (!existing) {
        throw new NotFoundError('Calificación no encontrada');
    }
    if (existing.calificador_id !== userId) {
        throw new ForbiddenError('No puedes editar una calificación que no hiciste');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (data.puntuacion) { fields.push(`puntuacion = $${idx++}`); values.push(data.puntuacion); }
    if (data.puntuacion_maquinaria !== undefined) { fields.push(`puntuacion_maquinaria = $${idx++}`); values.push(data.puntuacion_maquinaria); }
    if (data.comentario !== undefined) { fields.push(`comentario = $${idx++}`); values.push(data.comentario); }

    if (fields.length === 0) return existing;

    return await calificacionRepository.update(id, fields, values);
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
    create, getByUser, getMyRatings, getByMachinery, getAverage,
    update, remove, report, adminRatingStats
};
