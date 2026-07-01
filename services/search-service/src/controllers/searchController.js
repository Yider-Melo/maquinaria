// Controlador de busqueda.
// Proporciona busqueda por texto/filtros, sugerencias, cercania geografica
// y operaciones manuales de indexacion.
const pool = require('../db');
const { ValidationError } = require('shared');

// Busqueda principal. Construye condiciones dinamicamente segun los filtros
// recibidos (texto, tipo, precio, ciudad, ubicacion). Retorna resultados paginados.
async function search(filters) {
    const conditions = [];
    const values = [];
    let idx = 1;

    // Filtro de busqueda por texto (titulo, descripcion, marca, modelo)
    if (filters.q) {
        conditions.push(`(m.titulo ILIKE $${idx} OR COALESCE(m.descripcion, '') ILIKE $${idx} OR COALESCE(m.marca, '') ILIKE $${idx} OR COALESCE(m.modelo, '') ILIKE $${idx})`);
        values.push(`%${filters.q}%`);
        idx++;
    }

    if (filters.tipo) {
        conditions.push(`m.tipo = $${idx++}`);
        values.push(filters.tipo);
    }

    if (filters.minPrice !== undefined) {
        conditions.push(`m.precio_por_dia >= $${idx++}`);
        values.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
        conditions.push(`m.precio_por_dia <= $${idx++}`);
        values.push(filters.maxPrice);
    }

    if (filters.ciudad) {
        conditions.push(`LOWER(m.ciudad) LIKE $${idx++}`);
        values.push(`%${filters.ciudad.toLowerCase()}%`);
    }

    if (filters.departamento) {
        conditions.push(`LOWER(m.departamento) = $${idx++}`);
        values.push(filters.departamento.toLowerCase());
    }

    // Filtro de cercania por coordenadas (calculo aproximado con lat/lng)
    if (filters.lat !== undefined && filters.lng !== undefined && filters.radius) {
        const latDiff = filters.radius / 111.0;
        const lngDiff = filters.radius / (111.0 * Math.cos(filters.lat * Math.PI / 180));
        conditions.push(`m.ubicacion_lat BETWEEN $${idx++} AND $${idx++}`);
        values.push(filters.lat - latDiff, filters.lat + latDiff);
        conditions.push(`m.ubicacion_lng BETWEEN $${idx++} AND $${idx++}`);
        values.push(filters.lng - lngDiff, filters.lng + lngDiff);
    }

    conditions.push('m.disponible = true');
    conditions.push('m.activo = true');

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
        `SELECT COUNT(*) FROM maquinaria m ${whereClause}`,
        values
    );
    const total = parseInt(countResult.rows[0].count);

    const page = filters.page || 1;
    const size = Math.min(filters.size || 20, 100);
    const offset = (page - 1) * size;

    let orderBy = 'ORDER BY m.precio_por_dia ASC';
    if (filters.sort === 'price_desc') orderBy = 'ORDER BY m.precio_por_dia DESC';

    const result = await pool.query(
        `SELECT m.id, m.titulo, m.descripcion, m.tipo, m.marca, m.modelo, m.anio,
                m.capacidad, m.estado, m.precio_por_dia,
                m.ubicacion_lat, m.ubicacion_lng, m.ciudad, m.departamento
         FROM maquinaria m
         ${whereClause} ${orderBy} LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, size, offset]
    );

    return {
        data: result.rows,
        pagination: { total, page, size, totalPages: Math.ceil(total / size) }
    };
}

// Obtiene sugerencias de titulos para autocompletado.
async function getSuggestions(query) {
    if (!query || query.trim().length === 0) return [];

    const result = await pool.query(
        `SELECT DISTINCT titulo FROM maquinaria
         WHERE titulo ILIKE $1 AND activo = true AND disponible = true
         LIMIT 10`,
        [`%${query}%`]
    );
    return result.rows.map(r => r.titulo);
}

// Busca maquinaria cercana a una ubicacion usando un filtro de caja delimitadora.
async function getNearby(lat, lng, radius = 50) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        throw new ValidationError('Latitud y longitud requeridas');
    }

    const latDiff = radius / 111.0;
    const lngDiff = radius / (111.0 * Math.cos(lat * Math.PI / 180));

    const result = await pool.query(
        `SELECT m.id, m.titulo, m.tipo, m.precio_por_dia, m.ubicacion_lat, m.ubicacion_lng, m.ciudad
         FROM maquinaria m
         WHERE m.disponible = true AND m.activo = true
           AND m.ubicacion_lat BETWEEN $1 AND $2
           AND m.ubicacion_lng BETWEEN $3 AND $4
         ORDER BY m.precio_por_dia ASC
         LIMIT 50`,
        [lat - latDiff, lat + latDiff, lng - lngDiff, lng + lngDiff]
    );

    return result.rows;
}

// Indexa (inserta o actualiza) una maquinaria en el indice local.
async function indexMachinery(data) {
    await pool.query(
        `INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento, disponible, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
           titulo = EXCLUDED.titulo,
           descripcion = EXCLUDED.descripcion,
           tipo = EXCLUDED.tipo,
           marca = EXCLUDED.marca,
           modelo = EXCLUDED.modelo,
           anio = EXCLUDED.anio,
           precio_por_dia = EXCLUDED.precio_por_dia,
           ubicacion_lat = EXCLUDED.ubicacion_lat,
           ubicacion_lng = EXCLUDED.ubicacion_lng,
           ciudad = EXCLUDED.ciudad,
           departamento = EXCLUDED.departamento,
           disponible = EXCLUDED.disponible,
           activo = EXCLUDED.activo`,
         [data.id, data.propietario_id, data.titulo, data.descripcion, data.tipo, data.marca,
          data.modelo, data.anio, data.capacidad, data.estado, data.precio_por_dia,
          data.ubicacion_lat, data.ubicacion_lng, data.direccion, data.ciudad, data.departamento,
          data.disponible !== false, data.activo !== false]
    );
}

// Marca una maquinaria como inactiva en el indice (soft-delete).
async function removeFromIndex(id) {
    await pool.query('UPDATE maquinaria SET activo = false WHERE id = $1', [id]);
}

module.exports = {
    search,
    getSuggestions,
    getNearby,
    indexMachinery,
    removeFromIndex
};
