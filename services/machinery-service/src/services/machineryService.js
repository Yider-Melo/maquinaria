const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ForbiddenError, ValidationError, eventBus, EVENT_TYPES } = require('shared');
const maquinariaRepository = require('../repositories/maquinariaRepository');

async function create(data, propietarioId) {
    const id = uuidv4();
    const maquinaria = await maquinariaRepository.insert({ id, propietarioId, data });
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.CREATED, maquinaria);
    return maquinaria;
}

async function getById(id) {
    const maquinaria = await maquinariaRepository.findActiveById(id);
    if (!maquinaria) {
        throw new NotFoundError('Maquinaria no encontrada');
    }
    return maquinaria;
}

async function getByOwner(ownerId, page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await maquinariaRepository.findByOwner(ownerId, page, size);
    return { data, total, page, size };
}

async function listActive(page = 1, size = 20) {
    size = Math.min(size, 100);
    const { data, total } = await maquinariaRepository.findActive(page, size);
    return { data, total, page, size };
}

async function update(id, data, userId) {
    const existing = await getById(id);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso para editar esta maquinaria');
    }

    const fields = [];
    const values = [];
    let idx = 1;
    const allowedFields = ['titulo', 'descripcion', 'tipo', 'marca', 'modelo', 'anio', 'capacidad',
        'estado', 'precio_por_dia', 'ubicacion_lat', 'ubicacion_lng',
        'direccion', 'ciudad', 'departamento', 'disponible'];

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            fields.push(`${field} = $${idx++}`);
            values.push(data[field]);
        }
    }

    if (fields.length > 0) {
        await maquinariaRepository.update(id, fields, values);
    }

    const updated = await getById(id);
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.UPDATED, updated);
    return updated;
}

async function remove(id, userId) {
    const existing = await getById(id);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso para eliminar esta maquinaria');
    }

    await maquinariaRepository.softDelete(id);
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.DELETED, { id });

    return { message: 'Maquinaria eliminada' };
}

async function addImage(machineryId, url, userId) {
    if (!url) throw new ValidationError('URL de imagen requerida');

    const existing = await getById(machineryId);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso');
    }

    let urlFinal = url;
    const r2 = require('../config/r2');
    if (r2.habilitado && typeof url === 'string' && url.startsWith('data:')) {
        const match = url.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/s);
        if (match) {
            const contentType = match[1];
            const buffer = Buffer.from(match[2], 'base64');
            const ext = contentType === 'image/svg+xml' ? 'svg'
                : (contentType.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
            const clave = `maquinaria/${machineryId}/${uuidv4()}.${ext}`;
            const publicUrl = await r2.subirImagen(clave, buffer, contentType);
            if (publicUrl) urlFinal = publicUrl;
        }
    }

    const imgCount = await maquinariaRepository.countImages(machineryId);
    const esPortada = imgCount === 0;
    const id = uuidv4();

    await maquinariaRepository.insertImage({ id, machineryId, url: urlFinal, orden: imgCount + 1, esPortada });
    return { id, url: urlFinal, es_portada: esPortada };
}

async function deleteImage(machineryId, imageId, userId) {
    const existing = await getById(machineryId);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso');
    }

    const image = await maquinariaRepository.findImageByIdAndMachinery(imageId, machineryId);
    if (!image) {
        throw new NotFoundError('Imagen no encontrada');
    }

    const r2 = require('../config/r2');
    const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
    if (publicUrl && typeof image.url === 'string' && image.url.startsWith(publicUrl + '/')) {
        const clave = image.url.slice(publicUrl.length + 1);
        await r2.eliminarImagen(clave);
    }

    await maquinariaRepository.deleteImage(imageId, machineryId);
    return { message: 'Imagen eliminada' };
}

async function getImages(machineryId) {
    return await maquinariaRepository.findImagesByMachinery(machineryId);
}

async function updateAvailability(machineryId, fechas, userId) {
    const existing = await getById(machineryId);
    if (existing.propietario_id !== userId) {
        throw new ForbiddenError('No tienes permiso');
    }

    await maquinariaRepository.batchUpsertAvailability(machineryId, fechas);

    return { message: 'Disponibilidad actualizada', fechas_actualizadas: fechas.length };
}

async function getAvailability(machineryId, startDate, endDate) {
    if (!startDate || !endDate) throw new ValidationError('Fechas start y end requeridas');
    return await maquinariaRepository.findAvailability(machineryId, startDate, endDate);
}

async function adminMachineryStats() {
    return await maquinariaRepository.getAdminStats();
}

async function adminAllMachinery(page = 1, size = 20, q) {
    size = Math.min(size, 100);
    const { data, total } = await maquinariaRepository.findAllAdmin(page, size, q);
    return { data, total, page, size };
}

async function adminSetMachineryStatus(id, active) {
    const maquinaria = await maquinariaRepository.setActiveAdmin(id, active);
    if (!maquinaria) throw new NotFoundError('Maquinaria no encontrada');
    return maquinaria;
}

async function updateRating(id, puntuacionPromedio, totalResenas) {
    const fields = ['puntuacion_promedio = $1', 'total_resenas = $2'];
    const values = [puntuacionPromedio, totalResenas];
    await maquinariaRepository.update(id, fields, values);
    const updated = await getById(id);
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.UPDATED, updated);
    return updated;
}

async function setDisponible(id, disponible) {
    const maquinaria = await maquinariaRepository.findActiveById(id);
    if (!maquinaria) throw new NotFoundError('Maquinaria no encontrada');
    await maquinariaRepository.update(id, ['disponible = $1'], [disponible]);
    const updated = await maquinariaRepository.findActiveById(id);
    eventBus.publishEvent(EVENT_TYPES.MACHINERY.UPDATED, updated);
    return updated;
}

async function toggleFavorite(userId, machineryId) {
    const existing = await maquinariaRepository.isFavorite(userId, machineryId);
    if (existing) {
        await maquinariaRepository.removeFavorite(userId, machineryId);
        return { favorito: false };
    }
    await maquinariaRepository.addFavorite(userId, machineryId);
    return { favorito: true };
}

async function getFavorites(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    return await maquinariaRepository.findFavorites(userId, page, size);
}

async function checkFavorite(userId, machineryId) {
    return { favorito: await maquinariaRepository.isFavorite(userId, machineryId) };
}

module.exports = {
    create, getById, getByOwner, listActive, update, remove,
    addImage, deleteImage, getImages,
    updateAvailability, getAvailability,
    adminMachineryStats, adminAllMachinery, adminSetMachineryStatus, updateRating, setDisponible,
    toggleFavorite, getFavorites, checkFavorite
};
