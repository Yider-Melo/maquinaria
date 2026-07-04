const { ValidationError } = require('shared');
const searchRepository = require('../repositories/searchRepository');

async function search(filters) {
    const conditions = [];
    const values = [];
    let idx = 1;

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

    if (filters.lat !== undefined && filters.lng !== undefined && filters.radius) {
        const latDiff = filters.radius / 111.0;
        const lngDiff = filters.radius / (111.0 * Math.cos(filters.lat * Math.PI / 180));
        conditions.push(`m.ubicacion_lat BETWEEN $${idx++} AND $${idx++}`);
        values.push(filters.lat - latDiff, filters.lat + latDiff);
        conditions.push(`m.ubicacion_lng BETWEEN $${idx++} AND $${idx++}`);
        values.push(filters.lng - lngDiff, filters.lng + lngDiff);
    }

    conditions.push('m.disponible = true', 'm.activo = true');

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const size = Math.min(filters.size || 20, 100);
    const offset = (page - 1) * size;
    let orderBy = 'ORDER BY m.precio_por_dia ASC';
    if (filters.sort === 'price_desc') orderBy = 'ORDER BY m.precio_por_dia DESC';

    const { data, total } = await searchRepository.searchWithFilters(whereClause, values, orderBy, size, offset);

    return { data, pagination: { total, page, size, totalPages: Math.ceil(total / size) } };
}

async function getSuggestions(query) {
    if (!query || query.trim().length === 0) return [];
    return await searchRepository.getSuggestions(query);
}

async function getNearby(lat, lng, radius = 50) {
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        throw new ValidationError('Latitud y longitud requeridas');
    }

    const latDiff = radius / 111.0;
    const lngDiff = radius / (111.0 * Math.cos(lat * Math.PI / 180));

    return await searchRepository.getNearby(lat - latDiff, lat + latDiff, lng - lngDiff, lng + lngDiff);
}

async function indexMachinery(data) {
    await searchRepository.upsert(data);
}

async function removeFromIndex(id) {
    await searchRepository.softDelete(id);
}

module.exports = {
    search, getSuggestions, getNearby, indexMachinery, removeFromIndex
};
