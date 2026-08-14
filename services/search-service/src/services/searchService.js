const { ValidationError } = require('shared');
const searchRepository = require('../repositories/searchRepository');

async function search(filters) {
    const conditions = [];
    const values = [];
    let idx = 1;
    const page = Number(filters.page) || 1;
    const size = Math.min(Number(filters.size) || 20, 100);

    if (filters.propietario_id) {
        conditions.push(`m.propietario_id = $${idx++}`);
        values.push(filters.propietario_id);
    }

    if (filters.q) {
        // Búsqueda full-text (TSVECTOR + GIN) con coincidencia de prefijos.
        // El texto_completo se mantiene con un trigger al indexar la maquinaria.
        const tokens = String(filters.q).trim().split(/\s+/).filter(Boolean)
            .map(t => t.replace(/[^\p{L}\p{N}]/gu, '').trim())
            .filter(Boolean);
        if (tokens.length > 0) {
            const tsquery = tokens.map(t => `${t}:*`).join(' & ');
            conditions.push(`m.texto_completo @@ to_tsquery('spanish', $${idx})`);
            values.push(tsquery);
            idx++;
        }
    }

    if (filters.tipo) {
        conditions.push(`LOWER(m.tipo) LIKE $${idx++}`);
        values.push(`%${filters.tipo.toLowerCase()}%`);
    }

    if (filters.minPrice !== undefined && filters.minPrice !== null) {
        conditions.push(`m.precio_por_dia >= $${idx++}`);
        values.push(Number(filters.minPrice));
    }

    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
        conditions.push(`m.precio_por_dia <= $${idx++}`);
        values.push(Number(filters.maxPrice));
    }

    // La geolocalización (GPS) es el filtro principal de ubicación cuando está activa.
    // Por eso se evalúa primero: si viene lat/lng/radius, reemplaza a ciudad y departamento
    // (que pasan a ser secundarios y no deben restringir los resultados de cercanía).
    let hasLocation = false;
    if (filters.lat !== undefined && filters.lng !== undefined && filters.radius) {
        const lat = Number(filters.lat);
        const lng = Number(filters.lng);
        const radius = Number(filters.radius);
        const latDiff = radius / 111.0;
        const lngDiff = radius / (111.0 * Math.cos(lat * Math.PI / 180));
        conditions.push(`m.ubicacion_lat BETWEEN $${idx++} AND $${idx++}`);
        values.push(lat - latDiff, lat + latDiff);
        conditions.push(`m.ubicacion_lng BETWEEN $${idx++} AND $${idx++}`);
        values.push(lng - lngDiff, lng + lngDiff);
        hasLocation = true;
    }

    if (!hasLocation && filters.ciudad) {
        conditions.push(`unaccent(LOWER(m.ciudad)) LIKE unaccent($${idx++})`);
        values.push(`%${filters.ciudad.trim().toLowerCase()}%`);
    }

    if (!hasLocation && filters.departamento) {
        conditions.push(`unaccent(LOWER(m.departamento)) = unaccent($${idx++})`);
        values.push(filters.departamento.trim().toLowerCase());
    }

    conditions.push('m.disponible = true', 'm.activo = true');

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * size;
    const allowedSorts = {
        price_asc: 'ORDER BY m.precio_por_dia ASC NULLS LAST',
        price_desc: 'ORDER BY m.precio_por_dia DESC NULLS LAST',
        rating: 'ORDER BY m.puntuacion_promedio DESC NULLS LAST, m.total_resenas DESC',
    };
    if (hasLocation) {
        const lat = Number(filters.lat);
        const lng = Number(filters.lng);
        const latIdx = idx;
        const lngIdx = idx + 1;
        idx += 2;
        allowedSorts.distance = `ORDER BY POWER(111.0 * (m.ubicacion_lat - $${latIdx}), 2) + POWER(111.0 * ($${lngIdx} - m.ubicacion_lng) * COS(m.ubicacion_lat / 57.3), 2) ASC NULLS LAST`;
    } else {
        allowedSorts.distance = 'ORDER BY m.precio_por_dia ASC NULLS LAST';
    }
    const orderBy = allowedSorts[filters.sort] || allowedSorts.price_asc;

    const { data, total } = hasLocation
        ? await searchRepository.searchWithFiltersLocation(whereClause, values, orderBy, size, offset, [Number(filters.lat), Number(filters.lng)])
        : await searchRepository.searchWithFilters(whereClause, values, orderBy, size, offset);

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
