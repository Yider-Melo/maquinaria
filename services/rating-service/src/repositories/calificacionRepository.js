const pool = require('../db');

const CALIFICACION_COLUMNS = `id, reserva_id, maquinaria_id, calificador_id, calificado_id,
    puntuacion, puntuacion_maquinaria, comentario, activo, reportado, motivo_reporte, creado_en, actualizado_en`;

async function findByReservaAndCalificador(reservaId, calificadorId) {
    const result = await pool.query(
        'SELECT id FROM calificacion WHERE reserva_id = $1 AND calificador_id = $2',
        [reservaId, calificadorId]
    );
    return result.rows[0] || null;
}

async function insert({ id, reservaId, maquinariaId, calificadorId, calificadoId, puntuacion, puntuacion_maquinaria, comentario }) {
    const result = await pool.query(
        `INSERT INTO calificacion (id, reserva_id, maquinaria_id, calificador_id, calificado_id, puntuacion, puntuacion_maquinaria, comentario)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${CALIFICACION_COLUMNS}`,
        [id, reservaId, maquinariaId, calificadorId, calificadoId, puntuacion, puntuacion_maquinaria || null, comentario]
    );
    return result.rows[0];
}

async function findByCalificador(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM calificacion WHERE calificador_id = $1 AND activo = true', [userId]
    );
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${CALIFICACION_COLUMNS} FROM calificacion
         WHERE calificador_id = $1 AND activo = true
         ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );
    return { data: result.rows, total, page, size };
}

async function findByCalificado(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM calificacion WHERE calificado_id = $1 AND activo = true', [userId]
    );
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${CALIFICACION_COLUMNS} FROM calificacion
         WHERE calificado_id = $1 AND activo = true
         ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );
    return { data: result.rows, total, page, size };
}

async function findByMaquinaria(machineryId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM calificacion WHERE maquinaria_id = $1 AND activo = true', [machineryId]
    );
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${CALIFICACION_COLUMNS} FROM calificacion
         WHERE maquinaria_id = $1 AND activo = true
         ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [machineryId, size, offset]
    );
    return { data: result.rows, total, page, size };
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
    const result = await pool.query(`SELECT ${CALIFICACION_COLUMNS} FROM calificacion WHERE id = $1`, [id]);
    return result.rows[0] || null;
}

async function update(id, fields, values) {
    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const idx = values.length;
    const result = await pool.query(
        `UPDATE calificacion SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${CALIFICACION_COLUMNS}`,
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
         WHERE id = $1 RETURNING ${CALIFICACION_COLUMNS}`,
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
        `SELECT ${CALIFICACION_COLUMNS} FROM calificacion WHERE reportado = true AND activo = true ORDER BY creado_en DESC`
    );
    return { resumen: result.rows[0], reportadas: reportadas.rows };
}

async function withTransaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    findByReservaAndCalificador, insert,
    findByCalificado, findByCalificador, findByMaquinaria, getAverage,
    findById, update, softDelete, report, getAdminStats, withTransaction
};