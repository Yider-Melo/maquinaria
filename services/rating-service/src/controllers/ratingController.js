// Controlador de calificaciones.
// Maneja creacion, consulta (por usuario, maquinaria y promedio),
// actualizacion, eliminacion y reporte de calificaciones.
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { ConflictError, ValidationError, NotFoundError, ForbiddenError } = require('shared');

// Crea una calificacion. Verifica que el usuario no haya calificado ya
// la misma reserva y que no se califique a si mismo.
async function create(data, userId) {
    if (!data.reserva_id || !data.maquinaria_id || !data.calificado_id || !data.puntuacion) {
        throw new ValidationError('reserva_id, maquinaria_id, calificado_id y puntuacion son requeridos');
    }

    const existing = await pool.query(
        'SELECT id FROM calificacion WHERE reserva_id = $1 AND calificador_id = $2',
        [data.reserva_id, userId]
    );

    if (existing.rows.length > 0) {
        throw new ConflictError('Ya calificaste esta reserva');
    }

    if (data.calificado_id === userId) {
        throw new ValidationError('No puedes calificarte a ti mismo');
    }

    const id = uuidv4();
    const result = await pool.query(
        `INSERT INTO calificacion (id, reserva_id, maquinaria_id, calificador_id, calificado_id, puntuacion, comentario)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, data.reserva_id, data.maquinaria_id, userId, data.calificado_id, data.puntuacion, data.comentario]
    );

    return result.rows[0];
}

// Obtiene todas las calificaciones activas recibidas por un usuario.
async function getByUser(userId) {
    const result = await pool.query(
        `SELECT c.*
         FROM calificacion c
         WHERE c.calificado_id = $1 AND c.activo = true
         ORDER BY c.creado_en DESC`,
        [userId]
    );
    return result.rows;
}

// Obtiene todas las calificaciones activas de una maquinaria.
async function getByMachinery(machineryId) {
    const result = await pool.query(
        `SELECT c.*
         FROM calificacion c
         WHERE c.maquinaria_id = $1 AND c.activo = true
         ORDER BY c.creado_en DESC`,
        [machineryId]
    );
    return result.rows;
}

// Calcula el promedio de calificacion de un usuario y el total de votos.
async function getAverage(userId) {
    const result = await pool.query(
        `SELECT
           COALESCE(AVG(puntuacion), 0) as promedio,
           COUNT(*) as total
         FROM calificacion
         WHERE calificado_id = $1 AND activo = true`,
        [userId]
    );
    return result.rows[0];
}

// Actualiza puntuacion y/o comentario de una calificacion (solo el autor).
async function update(id, data, userId) {
    const existing = await pool.query(
        'SELECT * FROM calificacion WHERE id = $1',
        [id]
    );

    if (existing.rows.length === 0) {
        throw new NotFoundError('Calificación no encontrada');
    }

    if (existing.rows[0].calificador_id !== userId) {
        throw new ForbiddenError('No puedes editar una calificación que no hiciste');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (data.puntuacion) { fields.push(`puntuacion = $${idx++}`); values.push(data.puntuacion); }
    if (data.comentario !== undefined) { fields.push(`comentario = $${idx++}`); values.push(data.comentario); }

    if (fields.length === 0) return existing.rows[0];

    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
        `UPDATE calificacion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
    );

    return result.rows[0];
}

// Elimina (soft-delete) una calificacion (solo el autor).
async function remove(id, userId) {
    const existing = await pool.query('SELECT * FROM calificacion WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
        throw new NotFoundError('Calificación no encontrada');
    }

    if (existing.rows[0].calificador_id !== userId) {
        throw new ForbiddenError('No puedes eliminar una calificación que no hiciste');
    }

    await pool.query('UPDATE calificacion SET activo = false, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    return { message: 'Calificación eliminada' };
}

// Marca una calificacion como reportada con un motivo.
async function report(id, userId, motivo) {
    const result = await pool.query(
        `UPDATE calificacion SET reportado = true, motivo_reporte = $2, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [id, motivo]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Calificación no encontrada');
    }

    return result.rows[0];
}

async function adminRatingStats() {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN reportado = true THEN 1 END) as reportadas,
            COUNT(CASE WHEN activo = false THEN 1 END) as eliminadas,
            COALESCE(AVG(puntuacion), 0) as puntuacion_promedio
         FROM calificacion`
    );
    const reportadas = await pool.query(
        `SELECT *
         FROM calificacion
         WHERE reportado = true AND activo = true
         ORDER BY creado_en DESC`
    );
    return { resumen: result.rows[0], reportadas: reportadas.rows };
}

module.exports = {
    create,
    getByUser,
    getByMachinery,
    getAverage,
    update,
    remove,
    report,
    adminRatingStats
};
