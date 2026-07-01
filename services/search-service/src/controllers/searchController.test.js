const assert = require('node:assert/strict');
const { describe, it, mock } = require('node:test');

const pool = require('../db');
const searchController = require('./searchController');

describe('search', () => {
    it('debe buscar sin filtros', async () => {
        const originalQuery = pool.query;
        let callCount = 0;
        pool.query = mock.fn((sql) => {
            callCount++;
            if (sql.includes('COUNT')) {
                return Promise.resolve({ rows: [{ count: '2' }] });
            }
            return Promise.resolve({
                rows: [
                    { id: 'm-1', titulo: 'Excavadora', precio_por_dia: 500000 },
                    { id: 'm-2', titulo: 'Retroexcavadora', precio_por_dia: 450000 }
                ]
            });
        });

        const result = await searchController.search({});
        assert.equal(result.pagination.total, 2);
        assert.equal(result.data.length, 2);
        assert.equal(callCount, 2);

        pool.query = originalQuery;
    });

    it('debe aplicar filtro de texto', async () => {
        const originalQuery = pool.query;
        let capturedValues = null;
        pool.query = mock.fn((sql, values) => {
            if (sql.includes('COUNT')) return Promise.resolve({ rows: [{ count: '0' }] });
            capturedValues = values;
            return Promise.resolve({ rows: [] });
        });

        await searchController.search({ q: 'excavadora' });
        assert.ok(capturedValues[0].includes('excavadora'));

        pool.query = originalQuery;
    });

    it('debe aplicar filtro de precio minimo y maximo', async () => {
        const originalQuery = pool.query;
        let capturedValues = null;
        pool.query = mock.fn((sql, values) => {
            if (sql.includes('COUNT')) {
                capturedValues = values;
                return Promise.resolve({ rows: [{ count: '0' }] });
            }
            return Promise.resolve({ rows: [] });
        });

        await searchController.search({ minPrice: 100000, maxPrice: 500000 });
        assert.ok(capturedValues.includes(100000));
        assert.ok(capturedValues.includes(500000));

        pool.query = originalQuery;
    });

    it('debe aplicar filtro de ciudad', async () => {
        const originalQuery = pool.query;
        let capturedValues = null;
        pool.query = mock.fn((sql, values) => {
            if (sql.includes('COUNT')) {
                capturedValues = values;
                return Promise.resolve({ rows: [{ count: '0' }] });
            }
            return Promise.resolve({ rows: [] });
        });

        await searchController.search({ ciudad: 'Bogotá' });
        assert.ok(capturedValues[0].includes('bogotá'));

        pool.query = originalQuery;
    });

    it('debe ordenar por precio descendente', async () => {
        const originalQuery = pool.query;
        let capturedSQL = null;
        pool.query = mock.fn((sql, values) => {
            if (!sql.includes('COUNT')) {
                capturedSQL = sql;
                return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [{ count: '0' }] });
        });

        await searchController.search({ sort: 'price_desc' });
        assert.ok(capturedSQL.includes('DESC'));

        pool.query = originalQuery;
    });

    it('debe respetar limite de page size a 100', async () => {
        const originalQuery = pool.query;
        let capturedSize = null;
        pool.query = mock.fn((sql, values) => {
            if (!sql.includes('COUNT')) {
                capturedSize = values[values.length - 2];
                return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [{ count: '0' }] });
        });

        await searchController.search({ size: 999 });
        assert.equal(capturedSize, 100);

        pool.query = originalQuery;
    });
});

describe('getSuggestions', () => {
    it('debe devolver array vacio con query vacia', async () => {
        const result = await searchController.getSuggestions('');
        assert.deepEqual(result, []);
    });

    it('debe devolver array vacio con query solo espacios', async () => {
        const result = await searchController.getSuggestions('   ');
        assert.deepEqual(result, []);
    });

    it('debe devolver sugerencias', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ titulo: 'Excavadora CAT' }, { titulo: 'Retroexcavadora' }]
        }));

        const result = await searchController.getSuggestions('exc');
        assert.deepEqual(result, ['Excavadora CAT', 'Retroexcavadora']);

        pool.query = originalQuery;
    });
});

describe('getNearby', () => {
    it('debe lanzar ValidationError si lat no es valida', async () => {
        await assert.rejects(
            () => searchController.getNearby(undefined, -74),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe lanzar ValidationError si lng no es valida', async () => {
        await assert.rejects(
            () => searchController.getNearby(4.7, 'invalido'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe buscar por cercania', async () => {
        const originalQuery = pool.query;
        let capturedValues = null;
        pool.query = mock.fn((sql, values) => {
            capturedValues = values;
            return Promise.resolve({ rows: [] });
        });

        await searchController.getNearby(4.7, -74.0, 50);
        assert.ok(capturedValues.length > 0);
        assert.ok(capturedValues[0] < 4.7);
        assert.ok(capturedValues[1] > 4.7);

        pool.query = originalQuery;
    });
});

describe('indexMachinery', () => {
    it('debe insertar o actualizar en el indice', async () => {
        const originalQuery = pool.query;
        let capturedData = null;
        pool.query = mock.fn((sql, values) => {
            capturedData = values;
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        await searchController.indexMachinery({
            id: 'm-1',
            propietario_id: 'u-1',
            titulo: 'Excavadora',
            tipo: 'Excavadora',
            estado: 'bueno',
            precio_por_dia: 500000
        });

        assert.equal(capturedData[0], 'm-1');
        assert.equal(capturedData[2], 'Excavadora');

        pool.query = originalQuery;
    });

    it('debe respetar valores de disponible y activo', async () => {
        const originalQuery = pool.query;
        let capturedValues = null;
        pool.query = mock.fn((sql, values) => {
            capturedValues = values;
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        await searchController.indexMachinery({
            id: 'm-1',
            propietario_id: 'u-1',
            titulo: 'Test',
            tipo: 'Test',
            estado: 'bueno',
            precio_por_dia: 100,
            disponible: false,
            activo: true
        });

        assert.equal(capturedValues[capturedValues.length - 2], false);
        assert.equal(capturedValues[capturedValues.length - 1], true);

        pool.query = originalQuery;
    });
});

describe('removeFromIndex', () => {
    it('debe marcar como inactivo', async () => {
        const originalQuery = pool.query;
        let capturedSql = '';
        pool.query = mock.fn((sql, values) => {
            capturedSql = sql;
            assert.equal(values[0], 'm-1');
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        await searchController.removeFromIndex('m-1');
        assert.ok(capturedSql.includes('activo = false'));

        pool.query = originalQuery;
    });
});
