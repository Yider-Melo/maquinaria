const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_machinery_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';

const pool = require('../db');
const machineryService = require('../services/machineryService');
const { eventBus } = require('shared');

eventBus.publishEvent = async () => {};

before(async () => {
    await pool.query('DELETE FROM disponibilidad_maquinaria');
    await pool.query('DELETE FROM imagen_maquinaria');
    await pool.query('DELETE FROM maquinaria');
});

after(async () => {
    await pool.end();
});

describe('machinery integration', () => {
    const propietarioId = 'a0000000-0000-0000-0000-000000000002';
    let machineryId;

    it('debe crear maquinaria y persistirla en BD', async () => {
        const result = await machineryService.create({
            titulo: 'Retroexcavadora CAT 320',
            descripcion: 'Equipo en excelente estado',
            tipo: 'Excavadora',
            marca: 'Caterpillar',
            modelo: '320D',
            anio: 2020,
            estado: 'excelente',
            precio_por_dia: 450000,
            ciudad: 'Villavicencio',
            departamento: 'Meta',
            ubicacion_lat: 4.142,
            ubicacion_lng: -73.626
        }, propietarioId);

        machineryId = result.id;
        assert.ok(result.id);
        assert.equal(result.titulo, 'Retroexcavadora CAT 320');
        assert.equal(result.activo, true);
        assert.equal(result.disponible, true);

        const dbResult = await pool.query('SELECT * FROM maquinaria WHERE id = $1', [result.id]);
        assert.equal(dbResult.rows.length, 1);
        assert.equal(dbResult.rows[0].titulo, 'Retroexcavadora CAT 320');
        assert.equal(dbResult.rows[0].propietario_id, propietarioId);
    });

    it('debe obtener maquinaria por ID', async () => {
        const result = await machineryService.getById(machineryId);
        assert.equal(result.id, machineryId);
        assert.equal(result.titulo, 'Retroexcavadora CAT 320');
        assert.equal(result.propietario_id, propietarioId);
    });

    it('debe lanzar 404 si la maquinaria no existe', async () => {
        await assert.rejects(
            () => machineryService.getById('00000000-0000-0000-0000-000000000000'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );
    });

    it('debe listar maquinaria del propietario con paginacion', async () => {
        const result = await machineryService.getByOwner(propietarioId, 1, 10);
        assert.equal(result.total, 1);
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].titulo, 'Retroexcavadora CAT 320');
    });

    it('debe actualizar maquinaria', async () => {
        const updated = await machineryService.update(machineryId, {
            titulo: 'Retroexcavadora CAT 330',
            precio_por_dia: 500000
        }, propietarioId);

        assert.equal(updated.titulo, 'Retroexcavadora CAT 330');
        assert.equal(parseFloat(updated.precio_por_dia), 500000);

        const dbResult = await pool.query('SELECT * FROM maquinaria WHERE id = $1', [machineryId]);
        assert.equal(dbResult.rows[0].titulo, 'Retroexcavadora CAT 330');
    });

    it('debe rechazar actualizacion si no es el propietario', async () => {
        await assert.rejects(
            () => machineryService.update(machineryId, { titulo: 'Hackeado' }, 'other-user-id'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );
    });

    it('debe agregar y obtener imagenes', async () => {
        const img1 = await machineryService.addImage(machineryId, 'https://img.com/foto1.jpg', propietarioId);
        assert.ok(img1.id);
        assert.equal(img1.es_portada, true);

        const img2 = await machineryService.addImage(machineryId, 'https://img.com/foto2.jpg', propietarioId);
        assert.equal(img2.es_portada, false);

        const images = await machineryService.getImages(machineryId);
        assert.equal(images.length, 2);
        assert.equal(images[0].es_portada, true);
    });

    it('debe eliminar imagen', async () => {
        const images = await machineryService.getImages(machineryId);
        const imageId = images[0].id;

        await machineryService.deleteImage(machineryId, imageId, propietarioId);

        const remaining = await machineryService.getImages(machineryId);
        assert.equal(remaining.length, 1);
    });

    it('debe lanzar 404 al eliminar imagen inexistente', async () => {
        await assert.rejects(
            () => machineryService.deleteImage(machineryId, '00000000-0000-0000-0000-000000000000', propietarioId),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );
    });

    it('debe actualizar y consultar disponibilidad', async () => {
        const fechas = [
            { fecha: '2025-07-01', disponible: true },
            { fecha: '2025-07-02', disponible: false },
            { fecha: '2025-07-03', disponible: true }
        ];

        const updateResult = await machineryService.updateAvailability(machineryId, fechas, propietarioId);
        assert.equal(updateResult.fechas_actualizadas, 3);

        const availability = await machineryService.getAvailability(machineryId, '2025-07-01', '2025-07-03');
        assert.equal(availability.length, 3);
        const jul2 = availability.find(f => {
            const d = f.fecha instanceof Date ? f.fecha.toISOString().slice(0, 10) : f.fecha;
            return d === '2025-07-02';
        });
        assert.equal(jul2.disponible, false);
    });

    it('debe hacer soft-delete de maquinaria', async () => {
        await machineryService.remove(machineryId, propietarioId);

        const dbResult = await pool.query('SELECT activo FROM maquinaria WHERE id = $1', [machineryId]);
        assert.equal(dbResult.rows[0].activo, false);

        await assert.rejects(
            () => machineryService.getById(machineryId),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );
    });
});
