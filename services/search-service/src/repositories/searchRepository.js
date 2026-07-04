const pool = require('../db');

async function searchWithFilters(whereClause, values, orderBy, size, offset) {
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM maquinaria m ${whereClause}`,
        values
    );
    const total = parseInt(countResult.rows[0].count);

    const idx = values.length + 1;
    const result = await pool.query(
        `SELECT m.id, m.titulo, m.descripcion, m.tipo, m.marca, m.modelo, m.anio,
                m.capacidad, m.estado, m.precio_por_dia,
                m.ubicacion_lat, m.ubicacion_lng, m.ciudad, m.departamento
         FROM maquinaria m
         ${whereClause} ${orderBy} LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, size, offset]
    );

    return { data: result.rows, total };
}

async function getSuggestions(query) {
    const result = await pool.query(
        `SELECT DISTINCT titulo FROM maquinaria
         WHERE titulo ILIKE $1 AND activo = true AND disponible = true
         LIMIT 10`,
        [`%${query}%`]
    );
    return result.rows.map(r => r.titulo);
}

async function getNearby(latMin, latMax, lngMin, lngMax) {
    const result = await pool.query(
        `SELECT m.id, m.titulo, m.tipo, m.precio_por_dia, m.ubicacion_lat, m.ubicacion_lng, m.ciudad
         FROM maquinaria m
         WHERE m.disponible = true AND m.activo = true
           AND m.ubicacion_lat BETWEEN $1 AND $2
           AND m.ubicacion_lng BETWEEN $3 AND $4
         ORDER BY m.precio_por_dia ASC
         LIMIT 50`,
        [latMin, latMax, lngMin, lngMax]
    );
    return result.rows;
}

async function upsert(data) {
    await pool.query(
        `INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
           titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion,
           tipo = EXCLUDED.tipo, marca = EXCLUDED.marca, modelo = EXCLUDED.modelo,
           anio = EXCLUDED.anio, precio_por_dia = EXCLUDED.precio_por_dia,
           ubicacion_lat = EXCLUDED.ubicacion_lat, ubicacion_lng = EXCLUDED.ubicacion_lng,
           ciudad = EXCLUDED.ciudad, departamento = EXCLUDED.departamento,
           disponible = EXCLUDED.disponible, activo = EXCLUDED.activo`,
        [data.id, data.propietario_id, data.titulo, data.descripcion, data.tipo, data.marca,
         data.modelo, data.anio, data.capacidad, data.estado, data.precio_por_dia,
         data.ubicacion_lat, data.ubicacion_lng, data.direccion, data.ciudad, data.departamento,
         data.disponible !== false, data.activo !== false]
    );
}

async function softDelete(id) {
    await pool.query('UPDATE maquinaria SET activo = false WHERE id = $1', [id]);
}

module.exports = {
    searchWithFilters, getSuggestions, getNearby, upsert, softDelete
};
