const pool = require('../db');

async function findByReservaAndCalificador(reservaId, calificadorId) {
    const result = await pool.query(
        'SELECT id FROM calificacion WHERE reserva_id = $1 AND calificador_id = $2',
        [reservaId, calificadorId]
    );
    return result.rows[0] || null;
}

async function insert({ id, reservaId, maquinariaId, calificadorId, calificadoId, puntuacion, comentario }) {
    const result = await pool.query(
        `INSERT INTO calificacion (id, reserva_id, maquinaria_id, calificador_id, calificado_id, puntuacion, comentario)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, reservaId, maquinariaId, calificadorId, calificadoId, puntuacion, comentario]
    );
    return result.rows[0];
}

async function findByCalificado(userId) {
    const result = await pool.query(
        `SELECT c.* FROM calificacion c
         WHERE c.calificado_id = $1 AND c.activo = true
         ORDER BY c.creado_en DESC`,
        [userId]
    );
    return result.rows;
}

async function findByMaquinaria(machineryId) {
    const result = await pool.query(
        `SELECT c.* FROM calificacion c
         WHERE c.maquinaria_id = $1 AND c.activo = true
         ORDER BY c.creado_en DESC`,
        [machineryId]
    );
    return result.rows;
}

async function getAverage(userId) {
    const result = await pool.query(
        `SELECT COALESCE(AVG(puntuacion), 0) as promedio, COUNT(*) as total
         FROM calificacion WHERE calificado_id = $1 AND activo = true`,
        [userId]
    );
    return result.rows[0];
}

async function findById(id) {
    const result = await pool.query('SELECT * FROM calificacion WHERE id = $1', [id]);
    return result.rows[0] || null;
}

async function update(id, fields, values) {
    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const idx = values.length;
    const result = await pool.query(
        `UPDATE calificacion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
}

async function softDelete(id) {
    await pool.query(
        'UPDATE calificacion SET activo = false, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );
}

async function report(id, motivo) {
    const result = await pool.query(
        `UPDATE calificacion SET reportado = true, motivo_reporte = $2, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [id, motivo]
    );
    return result.rows[0] || null;
}

async function getAdminStats() {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN reportado = true THEN 1 END) as reportadas,
            COUNT(CASE WHEN activo = false THEN 1 END) as eliminadas,
            COALESCE(AVG(puntuacion), 0) as puntuacion_promedio
         FROM calificacion`
    );
    const reportadas = await pool.query(
        `SELECT * FROM calificacion WHERE reportado = true AND activo = true ORDER BY creado_en DESC`
    );
    return { resumen: result.rows[0], reportadas: reportadas.rows };
}

module.exports = {
    findByReservaAndCalificador, insert,
    findByCalificado, findByMaquinaria, getAverage,
    findById, update, softDelete, report, getAdminStats
};
