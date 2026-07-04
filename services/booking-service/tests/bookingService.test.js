const assert = require('node:assert/strict');
const { describe, it, mock } = require('node:test');

const pool = require('../db');
const { eventBus } = require('shared');
const axios = require('axios');

const bookingService = require('../services/bookingService');

process.env.MACHINERY_SERVICE_URL = 'http://localhost:3002';

describe('checkAvailability', () => {
    it('debe lanzar ValidationError si faltan parametros', async () => {
        await assert.rejects(
            () => bookingService.checkAvailability(null, '2025-01-01', '2025-01-05'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe devolver disponible true si no hay overlapping', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        const result = await bookingService.checkAvailability('m-1', '2025-01-01', '2025-01-05');
        assert.equal(result.disponible, true);
        assert.deepEqual(result.fechas_no_disponibles, []);

        pool.query = originalQuery;
    });

    it('debe devolver disponible false si hay overlapping', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ fecha_inicio: '2025-01-02', fecha_fin: '2025-01-04' }],
            rowCount: 1
        }));

        const result = await bookingService.checkAvailability('m-1', '2025-01-01', '2025-01-05');
        assert.equal(result.disponible, false);
        assert.equal(result.fechas_no_disponibles.length, 1);

        pool.query = originalQuery;
    });
});

describe('create', () => {
    it('debe lanzar ValidationError si faltan datos requeridos', async () => {
        await assert.rejects(
            () => bookingService.create({}, 'user-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe crear reserva exitosamente', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        const originalAxiosGet = axios.get;
        eventBus.publishEvent = mock.fn();
        axios.get = mock.fn(() => Promise.resolve({
            data: { data: { propietario_id: 'owner-id', precio_por_dia: 500000 } }
        }));

        pool.query = mock.fn((sql) => {
            if (sql.includes('INSERT')) {
                return Promise.resolve({
                    rows: [{
                        id: 'booking-1',
                        maquinaria_id: 'm-1',
                        arrendatario_id: 'user-id',
                        propietario_id: 'owner-id',
                        fecha_inicio: '2025-06-01',
                        fecha_fin: '2025-06-03',
                        precio_total: 1500000,
                        estado: 'pendiente'
                    }]
                });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });

        const result = await bookingService.create({
            maquinaria_id: 'm-1',
            fecha_inicio: '2025-06-01',
            fecha_fin: '2025-06-03'
        }, 'user-id');

        assert.equal(result.estado, 'pendiente');
        assert.equal(result.precio_total, 1500000);

        axios.get = originalAxiosGet;
        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });

    it('debe rechazar auto-reserva', async () => {
        const originalQuery = pool.query;
        const originalAxiosGet = axios.get;
        axios.get = mock.fn(() => Promise.resolve({
            data: { data: { propietario_id: 'user-id', precio_por_dia: 500000 } }
        }));

        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => bookingService.create({
                maquinaria_id: 'm-1',
                fecha_inicio: '2025-06-01',
                fecha_fin: '2025-06-03'
            }, 'user-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );

        axios.get = originalAxiosGet;
        pool.query = originalQuery;
    });
});

describe('getById', () => {
    it('debe devolver reserva si el usuario es parte', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', arrendatario_id: 'user-id', propietario_id: 'owner-id' }]
        }));

        const result = await bookingService.getById('b-1', 'user-id');
        assert.equal(result.id, 'b-1');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => bookingService.getById('no-existe', 'user-id'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar ForbiddenError si el usuario no es parte', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', arrendatario_id: 'arrendatario', propietario_id: 'propietario' }]
        }));

        await assert.rejects(
            () => bookingService.getById('b-1', 'otro-usuario'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('getByUser', () => {
    it('debe devolver reservas del arrendatario paginadas', async () => {
        const originalQuery = pool.query;
        let callCount = 0;
        pool.query = mock.fn((sql) => {
            callCount++;
            if (sql.includes('COUNT')) {
                return Promise.resolve({ rows: [{ count: '2' }] });
            }
            return Promise.resolve({ rows: [{ id: 'b-1' }, { id: 'b-2' }], rowCount: 2 });
        });

        const result = await bookingService.getByUser('user-id', 1, 10);
        assert.equal(result.total, 2);
        assert.equal(result.data.length, 2);

        pool.query = originalQuery;
    });
});

describe('getByOwner', () => {
    it('debe devolver reservas del propietario paginadas', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('COUNT')) {
                return Promise.resolve({ rows: [{ count: '1' }] });
            }
            return Promise.resolve({ rows: [{ id: 'b-1' }], rowCount: 1 });
        });

        const result = await bookingService.getByOwner('owner-id', 1, 10);
        assert.equal(result.total, 1);

        pool.query = originalQuery;
    });
});

describe('confirm', () => {
    it('debe confirmar reserva pendiente si es el propietario', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        eventBus.publishEvent = mock.fn();

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({
                    rows: [{ id: 'b-1', estado: 'confirmada', arrendatario_id: 'arrendatario', propietario_id: 'owner-id', fecha_inicio: '2025-01-01', fecha_fin: '2025-01-03' }]
                });
            }
            return Promise.resolve({
                rows: [{ id: 'b-1', estado: 'pendiente', arrendatario_id: 'arrendatario', propietario_id: 'owner-id' }]
            });
        });

        const result = await bookingService.confirm('b-1', 'owner-id');
        assert.equal(result.estado, 'confirmada');

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });

    it('debe lanzar error si no es el propietario', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', estado: 'pendiente', arrendatario_id: 'arrendatario', propietario_id: 'owner-id' }]
        }));

        await assert.rejects(
            () => bookingService.confirm('b-1', 'arrendatario'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar error si no esta pendiente', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', estado: 'cancelada', arrendatario_id: 'arrendatario', propietario_id: 'owner-id' }]
        }));

        await assert.rejects(
            () => bookingService.confirm('b-1', 'owner-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('reject', () => {
    it('debe rechazar reserva pendiente si es el propietario', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        eventBus.publishEvent = mock.fn();

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({
                    rows: [{ id: 'b-1', estado: 'rechazada', arrendatario_id: 'arrendatario', propietario_id: 'owner-id', fecha_inicio: '2025-01-01', fecha_fin: '2025-01-03' }]
                });
            }
            return Promise.resolve({
                rows: [{ id: 'b-1', estado: 'pendiente', arrendatario_id: 'arrendatario', propietario_id: 'owner-id' }]
            });
        });

        const result = await bookingService.reject('b-1', 'owner-id');
        assert.equal(result.estado, 'rechazada');

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });
});

describe('cancel', () => {
    it('debe cancelar reserva si es parte involucrada', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        eventBus.publishEvent = mock.fn();

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({
                    rows: [{ id: 'b-1', estado: 'cancelada', arrendatario_id: 'user-id', propietario_id: 'owner-id', fecha_inicio: '2025-01-01', fecha_fin: '2025-01-03', motivo_cancelacion: 'Ya no lo necesito' }]
                });
            }
            return Promise.resolve({
                rows: [{ id: 'b-1', estado: 'pendiente', arrendatario_id: 'user-id', propietario_id: 'owner-id' }]
            });
        });

        const result = await bookingService.cancel('b-1', 'user-id', 'Ya no lo necesito');
        assert.equal(result.estado, 'cancelada');

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });

    it('debe lanzar error si ya esta completada', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', estado: 'completada', arrendatario_id: 'user-id', propietario_id: 'owner-id' }]
        }));

        await assert.rejects(
            () => bookingService.cancel('b-1', 'user-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('complete', () => {
    it('debe completar reserva si es el propietario y esta confirmada', async () => {
        const originalQuery = pool.query;
        const originalPublish = eventBus.publishEvent;
        eventBus.publishEvent = mock.fn();

        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({
                    rows: [{ id: 'b-1', estado: 'completada', arrendatario_id: 'arrendatario', propietario_id: 'owner-id', fecha_inicio: '2025-01-01', fecha_fin: '2025-01-03' }]
                });
            }
            return Promise.resolve({
                rows: [{ id: 'b-1', estado: 'confirmada', arrendatario_id: 'arrendatario', propietario_id: 'owner-id' }]
            });
        });

        const result = await bookingService.complete('b-1', 'owner-id');
        assert.equal(result.estado, 'completada');

        eventBus.publishEvent = originalPublish;
        pool.query = originalQuery;
    });

    it('debe rechazar si no es el propietario', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', estado: 'confirmada', arrendatario_id: 'user-id', propietario_id: 'owner-id' }]
        }));

        await assert.rejects(
            () => bookingService.complete('b-1', 'user-id'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );

        pool.query = originalQuery;
    });
});
