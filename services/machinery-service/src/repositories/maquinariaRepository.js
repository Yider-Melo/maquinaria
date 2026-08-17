const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const MAQUINARIA_COLUMNS = `id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio,
    capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng,
    direccion, ciudad, departamento, puntuacion_promedio, total_resenas,
    disponible, activo, creado_en, actualizado_en`;

async function insert({ id, propietarioId, data }) {
    const result = await pool.query(
        `INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING ${MAQUINARIA_COLUMNS}`,
        [id, propietarioId, data.titulo, data.descripcion, data.tipo, data.marca, data.modelo,
         data.anio, data.capacidad, data.estado, data.precio_por_dia,
         data.ubicacion_lat, data.ubicacion_lng, data.direccion, data.ciudad, data.departamento]
    );
    return result.rows[0];
}

async function findActiveById(id) {
    const result = await pool.query(
        `SELECT ${MAQUINARIA_COLUMNS} FROM maquinaria WHERE id = $1 AND activo = true`,
        [id]
    );
    return result.rows[0] || null;
}

async function findByOwner(ownerId, page, size) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM maquinaria WHERE propietario_id = $1 AND activo = true',
        [ownerId]
    );
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${MAQUINARIA_COLUMNS} FROM maquinaria WHERE propietario_id = $1 AND activo = true
         ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [ownerId, size, offset]
    );
    return { data: result.rows, total };
}

async function findActive(page, size) {
    const offset = (page - 1) * size;
    const countResult = await pool.query('SELECT COUNT(*) FROM maquinaria WHERE activo = true');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
        `SELECT ${MAQUINARIA_COLUMNS} FROM maquinaria WHERE activo = true
         ORDER BY creado_en DESC LIMIT $1 OFFSET $2`,
        [size, offset]
    );
    return { data: result.rows, total };
}

async function update(id, fields, values) {
    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);
    const idx = values.length;
    await pool.query(
        `UPDATE maquinaria SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
    );
}

async function softDelete(id) {
    await pool.query(
        'UPDATE maquinaria SET activo = false, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
    );
}

async function countImages(machineryId) {
    const result = await pool.query(
        'SELECT COUNT(*) FROM imagen_maquinaria WHERE maquinaria_id = $1',
        [machineryId]
    );
    return parseInt(result.rows[0].count);
}

async function insertImage({ id, machineryId, url, orden, esPortada }) {
    await pool.query(
        'INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES ($1, $2, $3, $4, $5)',
        [id, machineryId, url, orden, esPortada]
    );
}

async function findImageByIdAndMachinery(imageId, machineryId) {
    const result = await pool.query(
        'SELECT id, url FROM imagen_maquinaria WHERE id = $1 AND maquinaria_id = $2',
        [imageId, machineryId]
    );
    return result.rows[0] || null;
}

async function deleteImage(imageId, machineryId) {
    await pool.query(
        'DELETE FROM imagen_maquinaria WHERE id = $1 AND maquinaria_id = $2',
        [imageId, machineryId]
    );
}

async function findImagesByMachinery(machineryId) {
    const result = await pool.query(
        'SELECT * FROM imagen_maquinaria WHERE maquinaria_id = $1 ORDER BY orden ASC',
        [machineryId]
    );
    return result.rows;
}

async function findCovers(ids) {
    if (!ids || !ids.length) return [];
    const result = await pool.query(
        `SELECT DISTINCT ON (maquinaria_id) maquinaria_id, url
         FROM imagen_maquinaria
         WHERE maquinaria_id = ANY($1::uuid[])
         ORDER BY maquinaria_id, es_portada DESC, orden ASC`,
        [ids]
    );
    return result.rows;
}

async function upsertAvailability(id, machineryId, fecha, disponible) {
    await pool.query(
        `INSERT INTO disponibilidad_maquinaria (id, maquinaria_id, fecha, disponible)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (maquinaria_id, fecha) DO UPDATE SET disponible = $4`,
        [id, machineryId, fecha, disponible]
    );
}

async function batchUpsertAvailability(machineryId, fechas) {
    if (fechas.length === 0) return;
    const values = [];
    const params = [];
    let idx = 1;
    for (const f of fechas) {
        values.push(uuidv4());
        params.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(machineryId, f.fecha, f.disponible);
    }
    await pool.query(
        `INSERT INTO disponibilidad_maquinaria (id, maquinaria_id, fecha, disponible)
         VALUES ${params.join(', ')}
         ON CONFLICT (maquinaria_id, fecha) DO UPDATE SET disponible = EXCLUDED.disponible`,
        values
    );
}

async function findAvailability(machineryId, startDate, endDate) {
    const result = await pool.query(
        `SELECT fecha, disponible FROM disponibilidad_maquinaria
         WHERE maquinaria_id = $1 AND fecha >= $2 AND fecha <= $3
         ORDER BY fecha ASC`,
        [machineryId, startDate, endDate]
    );
    return result.rows;
}

async function getAdminStats() {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN activo = true THEN 1 END) as activas,
            COUNT(CASE WHEN activo = false THEN 1 END) as inactivas,
            COUNT(DISTINCT propietario_id) as propietarios_con_maquinaria,
            COUNT(DISTINCT tipo) as tipos_distintos,
            COALESCE(AVG(precio_por_dia), 0) as precio_promedio_dia,
            COALESCE(MIN(precio_por_dia), 0) as precio_minimo,
            COALESCE(MAX(precio_por_dia), 0) as precio_maximo
         FROM maquinaria`
    );
    const tipoResult = await pool.query(
        `SELECT MIN(tipo) as tipo, COUNT(*) as cantidad FROM maquinaria WHERE activo = true GROUP BY LOWER(tipo) ORDER BY cantidad DESC`
    );
    return { resumen: result.rows[0], por_tipo: tipoResult.rows };
}

async function findAllAdmin(page, size, q) {
    const offset = (page - 1) * size;
    let where = '';
    const params = [];
    if (q) {
        params.push(`%${q}%`);
        where = 'WHERE (titulo ILIKE $1 OR marca ILIKE $1 OR modelo ILIKE $1 OR tipo ILIKE $1 OR CAST(id AS TEXT) ILIKE $1)';
    }
    const countResult = await pool.query(`SELECT COUNT(*) FROM maquinaria ${where}`, params);
    const total = parseInt(countResult.rows[0].count);
    const limitParams = [...params, size, offset];
    const limitIndex = params.length ? 2 : 1;
    const result = await pool.query(
        `SELECT ${MAQUINARIA_COLUMNS} FROM maquinaria ${where} ORDER BY creado_en DESC LIMIT $${limitIndex} OFFSET $${limitIndex + 1}`,
        limitParams
    );
    return { data: result.rows, total };
}

async function setActiveAdmin(id, active) {
    const result = await pool.query(
        `UPDATE maquinaria SET activo = $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [active, id]
    );
    return result.rows[0] || null;
}

async function addFavorite(userId, machineryId) {
    await pool.query(
        'INSERT INTO favoritos (usuario_id, maquinaria_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, machineryId]
    );
}

async function removeFavorite(userId, machineryId) {
    await pool.query(
        'DELETE FROM favoritos WHERE usuario_id = $1 AND maquinaria_id = $2',
        [userId, machineryId]
    );
}

async function findFavorites(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM favoritos WHERE usuario_id = $1',
        [userId]
    );
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await pool.query(
        `SELECT m.* FROM maquinaria m
         INNER JOIN favoritos f ON f.maquinaria_id = m.id
         WHERE f.usuario_id = $1 AND m.activo = true
         ORDER BY f.creado_en DESC
         LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );
    return { data: result.rows, total };
}

async function isFavorite(userId, machineryId) {
    const result = await pool.query(
        'SELECT 1 FROM favoritos WHERE usuario_id = $1 AND maquinaria_id = $2',
        [userId, machineryId]
    );
    return result.rows.length > 0;
}

module.exports = {
    insert, findActiveById, findByOwner, findActive, update, softDelete,
    countImages, insertImage, findImageByIdAndMachinery, deleteImage, findImagesByMachinery, findCovers,
    upsertAvailability, batchUpsertAvailability, findAvailability,
    getAdminStats, findAllAdmin, setActiveAdmin,
    addFavorite, removeFavorite, findFavorites, isFavorite
};
