const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_search_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';

const pool = require('../db');
const searchService = require('../services/searchService');

before(async () => {
    await pool.query('DELETE FROM maquinaria');
    await pool.query(`INSERT INTO maquinaria (id, propietario_id, titulo, descripcion, tipo, marca, modelo, estado, precio_por_dia, ubicacion_lat, ubicacion_lng, ciudad, departamento, disponible, activo) VALUES
        ('a1000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000010', 'Retroexcavadora CAT 320', 'Excelente para construccion', 'Excavadora', 'Caterpillar', '320D', 'excelente', 450000, 4.142, -73.626, 'Villavicencio', 'Meta', true, true),
        ('a1000002-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000020', 'Bulldozer D6', 'Potente maquinaria de movimiento de tierra', 'Topadora', 'Caterpillar', 'D6', 'bueno', 600000, 4.711, -74.072, 'Bogotá', 'Cundinamarca', true, true),
        ('a1000003-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000010', 'Camion Volquete', 'Capacidad 15 toneladas', 'Volquete', 'Kenworth', 'T800', 'regular', 350000, 3.437, -76.522, 'Cali', 'Valle del Cauca', true, true),
        ('a1000004-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000030', 'Excavadora Komatsu', NULL, 'Excavadora', 'Komatsu', 'PC200', 'nuevo', 550000, 6.244, -75.581, 'Medellin', 'Antioquia', true, true),
        ('a1000005-0000-0000-0000-000000000005', 'a1000001-0000-0000-0000-000000000020', 'Retroexcavadora JCB', 'Equipo en mantenimiento', 'Excavadora', 'JCB', '3CX', 'regular', 380000, 4.142, -73.626, 'Villavicencio', 'Meta', false, true)`);
});

after(async () => {
    await pool.end();
});

describe('search integration', () => {
    it('debe buscar todas las maquinarias activas y disponibles', async () => {
        const result = await searchService.search({});
        assert.equal(result.pagination.total, 4);
        assert.equal(result.data.length, 4);
    });

    it('debe filtrar por texto en titulo', async () => {
        const result = await searchService.search({ q: 'retroexcavadora' });
        assert.equal(result.pagination.total, 1);
        assert.equal(result.data[0].titulo, 'Retroexcavadora CAT 320');
    });

    it('debe filtrar por texto en descripcion', async () => {
        const result = await searchService.search({ q: 'construccion' });
        assert.equal(result.pagination.total, 1);
    });

    it('debe filtrar por tipo exacto', async () => {
        const result = await searchService.search({ tipo: 'Excavadora' });
        assert.equal(result.pagination.total, 2);
    });

    it('debe filtrar por rango de precio', async () => {
        const result = await searchService.search({ minPrice: 400000, maxPrice: 600000 });
        assert.equal(result.pagination.total, 3);
    });

    it('debe filtrar por ciudad (case insensitive)', async () => {
        const result = await searchService.search({ ciudad: 'villavicencio' });
        assert.equal(result.pagination.total, 1);
    });

    it('debe filtrar por departamento', async () => {
        const result = await searchService.search({ departamento: 'Meta' });
        assert.equal(result.pagination.total, 1);
    });

    it('debe ordenar por precio ascendente (default)', async () => {
        const result = await searchService.search({ sort: 'price_asc' });
        const prices = result.data.map(m => parseFloat(m.precio_por_dia));
        for (let i = 1; i < prices.length; i++) {
            assert.ok(prices[i] >= prices[i - 1]);
        }
    });

    it('debe ordenar por precio descendente', async () => {
        const result = await searchService.search({ sort: 'price_desc' });
        const prices = result.data.map(m => parseFloat(m.precio_por_dia));
        for (let i = 1; i < prices.length; i++) {
            assert.ok(prices[i] <= prices[i - 1]);
        }
    });

    it('debe paginar resultados', async () => {
        const result = await searchService.search({ page: 1, size: 2 });
        assert.equal(result.data.length, 2);
        assert.equal(result.pagination.total, 4);
        assert.equal(result.pagination.totalPages, 2);
    });

    it('debe obtener sugerencias de autocompletado', async () => {
        const suggestions = await searchService.getSuggestions('exc');
        assert.ok(suggestions.length >= 1);
        assert.ok(suggestions[0].toLowerCase().includes('exc'));
    });

    it('debe devolver array vacio para sugerencias sin match', async () => {
        const suggestions = await searchService.getSuggestions('zzzzzz');
        assert.deepEqual(suggestions, []);
    });

    it('debe buscar por cercania geografica', async () => {
        const result = await searchService.getNearby(4.14, -73.62, 10);
        assert.ok(result.length >= 1);
        assert.equal(result[0].ciudad, 'Villavicencio');
    });

    it('debe indexar nueva maquinaria manualmente', async () => {
        await searchService.indexMachinery({
            id: 'a1000006-0000-0000-0000-000000000006',
            propietario_id: 'a1000001-0000-0000-0000-000000000040',
            titulo: 'Montacargas Toyota',
            tipo: 'Montacargas',
            estado: 'bueno',
            precio_por_dia: 250000,
            ciudad: 'Bogotá',
            departamento: 'Cundinamarca',
            disponible: true,
            activo: true
        });

        const result = await searchService.search({ q: 'Montacargas' });
        assert.equal(result.pagination.total, 1);
    });

    it('debe eliminar maquinaria del indice', async () => {
        await searchService.removeFromIndex('a1000006-0000-0000-0000-000000000006');

        const result = await searchService.search({ q: 'Montacargas' });
        assert.equal(result.pagination.total, 0);
    });
});
