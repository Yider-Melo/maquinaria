const assert = require('node:assert/strict');
const { describe, it, mock } = require('node:test');

const pool = require('../db');
const { eventBus } = require('shared');

const machineryController = require('./machineryController');

function mockQuery(result) {
    return mock.fn(() => Promise.resolve({ rows: result, rowCount: result ? result.length : 0 }));
}

describe('create', () => {
    it('debe crear maquinaria y publicar evento', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        let publishedEvent = null;
        eventBus.publishEvent = mock.fn((type, data) => { publishedEvent = { type, data }; });

        const mockRow = { id: 'new-id', titulo: 'Excavadora CAT', propietario_id: 'user-id', activo: true };
        pool.query = mock.fn(() => Promise.resolve({ rows: [mockRow], rowCount: 1 }));

        const result = await machineryController.create({
            titulo: 'Excavadora CAT',
            tipo: 'Excavadora',
            estado: 'bueno',
            precio_por_dia: 500000
        }, 'user-id');

        assert.equal(result.id, 'new-id');
        assert.equal(result.titulo, 'Excavadora CAT');

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });
});

describe('getById', () => {
    it('debe devolver maquinaria si existe y esta activa', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([{ id: 'm-1', titulo: 'Retroexcavadora', activo: true }]);

        const result = await machineryController.getById('m-1');
        assert.equal(result.id, 'm-1');
        assert.equal(result.titulo, 'Retroexcavadora');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([]);

        await assert.rejects(
            () => machineryController.getById('no-existe'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('getByOwner', () => {
    it('debe devolver maquinaria del propietario paginada', async () => {
        const originalQuery = pool.query;
        let callCount = 0;
        pool.query = mock.fn((sql) => {
            callCount++;
            if (sql.includes('COUNT')) {
                return Promise.resolve({ rows: [{ count: '2' }], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'm-1', titulo: 'M1' }, { id: 'm-2', titulo: 'M2' }], rowCount: 2 });
        });

        const result = await machineryController.getByOwner('owner-id', 1, 10);
        assert.equal(result.total, 2);
        assert.equal(result.data.length, 2);
        assert.equal(result.page, 1);
        assert.equal(callCount, 2);

        pool.query = originalQuery;
    });
});

describe('update', () => {
    it('debe actualizar solo campos permitidos', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        eventBus.publishEvent = mock.fn();
        let updateSql = '';

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                updateSql = sql;
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'm-1', propietario_id: 'user-id', titulo: 'Original', activo: true }], rowCount: 1 });
        });

        await machineryController.update('m-1', { titulo: 'Nuevo titulo', campo_inventado: 'ignorado' }, 'user-id');
        assert.ok(updateSql.includes('titulo'));
        assert.ok(!updateSql.includes('campo_inventado'));

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });

    it('debe lanzar ForbiddenError si no es el propietario', async () => {
        const originalQuery = pool.query;
        pool.query = mockQuery([{ id: 'm-1', propietario_id: 'owner-id', activo: true }]);

        await assert.rejects(
            () => machineryController.update('m-1', { titulo: 'Nuevo' }, 'other-user'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('remove', () => {
    it('debe hacer soft-delete y publicar evento', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        eventBus.publishEvent = mock.fn();

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'm-1', propietario_id: 'user-id', activo: true }], rowCount: 1 });
        });

        const result = await machineryController.remove('m-1', 'user-id');
        assert.equal(result.message, 'Maquinaria eliminada');

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });
});

describe('addImage', () => {
    it('debe lanzar ValidationError si no hay url', async () => {
        const originalQuery = pool.query;

        await assert.rejects(
            () => machineryController.addImage('m-1', '', 'user-id'),
            (err) => {
                assert.equal(err.statusCode, 400);
                assert.equal(err.message, 'URL de imagen requerida');
                return true;
            }
        );

        pool.query = originalQuery;
    });

    it('debe marcar primera imagen como portada', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('COUNT')) {
                return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 });
            }
            if (sql.includes('INSERT')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'm-1', propietario_id: 'user-id', activo: true }], rowCount: 1 });
        });

        const result = await machineryController.addImage('m-1', 'https://img.com/photo.jpg', 'user-id');
        assert.ok(result.es_portada);

        pool.query = originalQuery;
    });
});

describe('deleteImage', () => {
    it('debe lanzar NotFoundError si la imagen no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('FROM imagen_maquinaria')) {
                return Promise.resolve({ rows: [], rowCount: 0 });
            }
            return Promise.resolve({ rows: [{ id: 'm-1', propietario_id: 'user-id', activo: true }], rowCount: 1 });
        });

        await assert.rejects(
            () => machineryController.deleteImage('m-1', 'img-no-existe', 'user-id'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('getImages', () => {
    it('debe devolver imagenes ordenadas', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'img-1', url: 'https://img.com/1.jpg', orden: 1 }],
            rowCount: 1
        }));

        const result = await machineryController.getImages('m-1');
        assert.equal(result.length, 1);
        assert.equal(result[0].orden, 1);

        pool.query = originalQuery;
    });
});

describe('updateAvailability', () => {
    it('debe hacer upsert de fechas', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('ON CONFLICT')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'm-1', propietario_id: 'user-id', activo: true }], rowCount: 1 });
        });

        const result = await machineryController.updateAvailability('m-1', [
            { fecha: '2025-01-01', disponible: true },
            { fecha: '2025-01-02', disponible: false }
        ], 'user-id');

        assert.equal(result.fechas_actualizadas, 2);

        pool.query = originalQuery;
    });
});

describe('getAvailability', () => {
    it('debe lanzar ValidationError sin fechas', async () => {
        await assert.rejects(
            () => machineryController.getAvailability('m-1', null, null),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe devolver disponibilidad en rango', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ fecha: '2025-01-01', disponible: true }],
            rowCount: 1
        }));

        const result = await machineryController.getAvailability('m-1', '2025-01-01', '2025-01-31');
        assert.equal(result.length, 1);
        assert.equal(result[0].disponible, true);

        pool.query = originalQuery;
    });

    it('debe devolver array vacio si no hay registros', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        const result = await machineryController.getAvailability('m-1', '2025-06-01', '2025-06-30');
        assert.deepEqual(result, []);

        pool.query = originalQuery;
    });
});
