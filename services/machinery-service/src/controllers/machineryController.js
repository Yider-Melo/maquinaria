// Controlador de maquinaria.
// Maneja CRUD de maquinaria, gestion de imagenes y disponibilidad por fechas.
// Publica eventos en RabbitMQ para sincronizar el indice de busqueda.

const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { NotFoundError, ForbiddenError, ValidationError, eventBus, EVENT_TYPES } = require('shared');

// Crea una nueva maquinaria y publica el evento de creacion.
async function create(data, propietarioId) {
    const id = uuidv4();
    const result = await pool.query(
        `INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, anio, capacidad, estado, precio_por_dia, precio_por_hora, ubicacion_lat, ubicacion_lng, direccion, ciudad, departamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [id, propietarioId, data.titulo, data.descripcion, data.tipo, data.marca, data.modelo,
         data.anio, data.capacidad, data.estado, data.precio_por_dia, data.precio_por_hora,
         data.ubicacion_lat, data.ubicacion_lng, data.direccion, data.ciudad, data.departamento]
    );

    const maquinaria = result.rows[0];
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.CREATED, maquinaria);
    return maquinaria;
}

// Obtiene una maquinaria por su ID si esta activa.
async function getById(id) {
    const result = await pool.query(
        `SELECT m.*
         FROM maquinaria m
         WHERE m.id = $1 AND m.activo = true`,
        [id]
    );

    if (result.rows.length === 0) {
        throw new NotFoundError('Maquinaria no encontrada');
    }

    return result.rows[0];
}

// Lista la maquinaria de un propietario con paginacion.
async function getByOwner(ownerId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM maquinaria WHERE propietario_id = $1 AND activo = true',
        [ownerId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
        `SELECT * FROM maquinaria WHERE propietario_id = $1 AND activo = true
         ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [ownerId, size, offset]
    );

    return { data: result.rows, total, page, size };
}

// Actualiza los campos permitidos de una maquinaria. Verifica propiedad.
async function update(id, data, userId) {
    const existing = await getById(id);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso para editar esta maquinaria');
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = ['titulo', 'descripcion', 'tipo', 'marca', 'modelo', 'anio', 'capacidad',
        'estado', 'precio_por_dia', 'precio_por_hora', 'ubicacion_lat', 'ubicacion_lng',
        'direccion', 'ciudad', 'departamento'];

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            fields.push(`${field} = $${idx++}`);
            values.push(data[field]);
        }
    }

    if (fields.length === 0) return getById(id);

    fields.push('actualizado_en = CURRENT_TIMESTAMP');
    values.push(id);

    await pool.query(
        `UPDATE maquinaria SET ${fields.join(', ')} WHERE id = $${idx}`,
        values
    );

    const updated = await getById(id);
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.UPDATED, updated);
    return updated;
}

// Elimina (soft-delete) una maquinaria. Verifica propiedad.
async function remove(id, userId) {
    const existing = await getById(id);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso para eliminar esta maquinaria');
    }

    await pool.query('UPDATE maquinaria SET activo = false, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1', [id]);

    eventBus.publishEvent(EVENT_TYPES.MACHINERY.DELETED, { id });

    return { message: 'Maquinaria eliminada' };
}

// Agrega una imagen a una maquinaria. La primera imagen se marca como portada.
async function addImage(machineryId, url, userId) {
    if (!url) throw new ValidationError('URL de imagen requerida');

    const existing = await getById(machineryId);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso');
    }

    const imgCount = await pool.query(
        'SELECT COUNT(*) FROM imagen_maquinaria WHERE maquinaria_id = $1',
        [machineryId]
    );
    const esPortada = parseInt(imgCount.rows[0].count) === 0;

    const id = uuidv4();
    await pool.query(
        'INSERT INTO imagen_maquinaria (id, maquinaria_id, url, orden, es_portada) VALUES ($1, $2, $3, $4, $5)',
        [id, machineryId, url, parseInt(imgCount.rows[0].count) + 1, esPortada]
    );

    return { id, url, es_portada: esPortada };
}

// Elimina una imagen especifica de una maquinaria.
async function deleteImage(machineryId, imageId, userId) {
    const existing = await getById(machineryId);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso');
    }

    const imgResult = await pool.query(
        'SELECT id FROM imagen_maquinaria WHERE id = $1 AND maquinaria_id = $2',
        [imageId, machineryId]
    );
    if (imgResult.rows.length === 0) {
        throw new NotFoundError('Imagen no encontrada');
    }

    await pool.query(
        'DELETE FROM imagen_maquinaria WHERE id = $1 AND maquinaria_id = $2',
        [imageId, machineryId]
    );

    return { message: 'Imagen eliminada' };
}

// Obtiene todas las imagenes de una maquinaria ordenadas por orden.
async function getImages(machineryId) {
    const result = await pool.query(
        'SELECT * FROM imagen_maquinaria WHERE maquinaria_id = $1 ORDER BY orden ASC',
        [machineryId]
    );
    return result.rows;
}

// Actualiza la disponibilidad de una maquinaria para un conjunto de fechas (upsert).
async function updateAvailability(machineryId, fechas, userId) {
    const existing = await getById(machineryId);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso');
    }

    for (const fecha of fechas) {
        await pool.query(
            `INSERT INTO disponibilidad_maquinaria (id, maquinaria_id, fecha, disponible)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (maquinaria_id, fecha) DO UPDATE SET disponible = $4`,
            [uuidv4(), machineryId, fecha.fecha, fecha.disponible]
        );
    }

    return { message: 'Disponibilidad actualizada', fechas_actualizadas: fechas.length };
}

// Obtiene la disponibilidad de una maquinaria en un rango de fechas.
async function getAvailability(machineryId, startDate, endDate) {
    if (!startDate || !endDate) throw new ValidationError('Fechas start y end requeridas');

    const result = await pool.query(
        `SELECT fecha, disponible FROM disponibilidad_maquinaria
         WHERE maquinaria_id = $1 AND fecha >= $2 AND fecha <= $3
         ORDER BY fecha ASC`,
        [machineryId, startDate, endDate]
    );

    if (result.rows.length === 0) {
        return [];
    }

    return result.rows;
}

module.exports = {
    create,
    getById,
    getByOwner,
    update,
    remove,
    addImage,
    deleteImage,
    getImages,
    updateAvailability,
    getAvailability
};
