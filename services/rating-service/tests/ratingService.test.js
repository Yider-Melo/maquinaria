const assert = require('node:assert/strict');
const { describe, it, mock } = require('node:test');

const pool = require('../db');
const ratingService = require('../services/ratingService');

describe('create', () => {
    it('debe lanzar ValidationError si faltan campos requeridos', async () => {
        await assert.rejects(
            () => ratingService.create({}, 'user-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe lanzar ConflictError si ya califico la misma reserva', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'existing-rating' }], rowCount: 1
        }));

        await assert.rejects(
            () => ratingService.create({
                reserva_id: 'r-1', maquinaria_id: 'm-1', calificado_id: 'owner-id', puntuacion: 5
            }, 'user-id'),
            (err) => { assert.equal(err.statusCode, 409); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar ValidationError si se califica a si mismo', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => ratingService.create({
                reserva_id: 'r-1', maquinaria_id: 'm-1', calificado_id: 'user-id', puntuacion: 5
            }, 'user-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe crear calificacion exitosamente', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('INSERT')) {
                return Promise.resolve({
                    rows: [{ id: 'new-rating', puntuacion: 5, comentario: 'Excelente', calificador_id: 'user-id' }]
                });
            }
            return Promise.resolve({ rows: [], rowCount: 0 });
        });

        const result = await ratingService.create({
            reserva_id: 'r-1', maquinaria_id: 'm-1', calificado_id: 'owner-id', puntuacion: 5, comentario: 'Excelente'
        }, 'user-id');

        assert.equal(result.puntuacion, 5);
        assert.equal(result.comentario, 'Excelente');

        pool.query = originalQuery;
    });
});

describe('getByUser', () => {
    it('debe devolver calificaciones de un usuario', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'r-1', puntuacion: 5 }, { id: 'r-2', puntuacion: 4 }]
        }));

        const result = await ratingService.getByUser('user-id');
        assert.equal(result.length, 2);

        pool.query = originalQuery;
    });

    it('debe devolver array vacio si no hay calificaciones', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        const result = await ratingService.getByUser('user-id');
        assert.deepEqual(result, []);

        pool.query = originalQuery;
    });
});

describe('getByMachinery', () => {
    it('debe devolver calificaciones de una maquinaria', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'r-1', puntuacion: 4 }]
        }));

        const result = await ratingService.getByMachinery('m-1');
        assert.equal(result.length, 1);

        pool.query = originalQuery;
    });
});

describe('getAverage', () => {
    it('debe devolver promedio y total', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ promedio: '4.5', total: '10' }]
        }));

        const result = await ratingService.getAverage('user-id');
        assert.equal(result.promedio, '4.5');
        assert.equal(result.total, '10');

        pool.query = originalQuery;
    });

    it('debe devolver 0 si no hay calificaciones', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ promedio: '0', total: '0' }]
        }));

        const result = await ratingService.getAverage('user-id');
        assert.equal(result.promedio, '0');
        assert.equal(result.total, '0');

        pool.query = originalQuery;
    });
});

describe('update', () => {
    it('debe actualizar puntuacion y comentario', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({
                    rows: [{ id: 'r-1', puntuacion: 4, comentario: 'Actualizado', calificador_id: 'user-id' }]
                });
            }
            return Promise.resolve({
                rows: [{ id: 'r-1', calificador_id: 'user-id' }]
            });
        });

        const result = await ratingService.update('r-1', { puntuacion: 4, comentario: 'Actualizado' }, 'user-id');
        assert.equal(result.puntuacion, 4);
        assert.equal(result.comentario, 'Actualizado');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => ratingService.update('no-existe', { puntuacion: 3 }, 'user-id'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar ForbiddenError si no es el autor', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'r-1', calificador_id: 'other-user' }]
        }));

        await assert.rejects(
            () => ratingService.update('r-1', { puntuacion: 3 }, 'user-id'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('remove', () => {
    it('debe hacer soft-delete', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({
                rows: [{ id: 'r-1', calificador_id: 'user-id' }]
            });
        });

        const result = await ratingService.remove('r-1', 'user-id');
        assert.equal(result.message, 'Calificación eliminada');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => ratingService.remove('no-existe', 'user-id'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('report', () => {
    it('debe marcar como reportado', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'r-1', reportado: true, motivo_reporte: 'Spam', calificador_id: 'user-id' }]
        }));

        const result = await ratingService.report('r-1', 'user-id', 'Spam');
        assert.equal(result.reportado, true);
        assert.equal(result.motivo_reporte, 'Spam');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => ratingService.report('no-existe', 'user-id', 'Spam'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});
