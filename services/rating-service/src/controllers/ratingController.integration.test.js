const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_rating_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';

const pool = require('../db');
const ratingController = require('./ratingController');

const CALIFICADOR_ID = 'a0000000-0000-0000-0000-000000000003';
const CALIFICADO_ID = 'a0000000-0000-0000-0000-000000000002';
const MAQUINARIA_ID = 'a0000000-0000-0000-0000-000000000100';
const RESERVA_ID = 'a0000000-0000-0000-0000-000000000200';

before(async () => {
    await pool.query('DELETE FROM calificacion');
});

after(async () => {
    await pool.end();
});

describe('rating integration', () => {
    let calificacionId;

    it('debe crear calificacion y persistirla', async () => {
        const result = await ratingController.create({
            reserva_id: RESERVA_ID,
            maquinaria_id: MAQUINARIA_ID,
            calificado_id: CALIFICADO_ID,
            puntuacion: 5,
            comentario: 'Excelente servicio'
        }, CALIFICADOR_ID);

        calificacionId = result.id;
        assert.ok(result.id);
        assert.equal(result.puntuacion, 5);
        assert.equal(result.comentario, 'Excelente servicio');
        assert.equal(result.calificador_id, CALIFICADOR_ID);
        assert.equal(result.calificado_id, CALIFICADO_ID);

        const dbResult = await pool.query('SELECT * FROM calificacion WHERE id = $1', [result.id]);
        assert.equal(dbResult.rows.length, 1);
        assert.equal(dbResult.rows[0].puntuacion, 5);
    });

    it('debe rechazar duplicado por misma reserva', async () => {
        await assert.rejects(
            () => ratingController.create({
                reserva_id: RESERVA_ID,
                maquinaria_id: MAQUINARIA_ID,
                calificado_id: CALIFICADO_ID,
                puntuacion: 3
            }, CALIFICADOR_ID),
            (err) => { assert.equal(err.statusCode, 409); return true; }
        );
    });

    it('debe rechazar autocalificacion', async () => {
        await assert.rejects(
            () => ratingController.create({
                reserva_id: 'a0000000-0000-0000-0000-000000000201',
                maquinaria_id: MAQUINARIA_ID,
                calificado_id: CALIFICADOR_ID,
                puntuacion: 5
            }, CALIFICADOR_ID),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe obtener calificaciones por usuario calificado', async () => {
        const result = await ratingController.getByUser(CALIFICADO_ID);
        assert.equal(result.length, 1);
        assert.equal(result[0].puntuacion, 5);
    });

    it('debe obtener promedio de calificacion', async () => {
        const result = await ratingController.getAverage(CALIFICADO_ID);
        assert.equal(parseFloat(result.promedio), 5);
        assert.equal(parseInt(result.total), 1);
    });

    it('debe obtener promedio 0 si no hay calificaciones', async () => {
        const result = await ratingController.getAverage('a0000000-0000-0000-0000-000000000999');
        assert.equal(parseFloat(result.promedio), 0);
        assert.equal(parseInt(result.total), 0);
    });

    it('debe actualizar calificacion', async () => {
        const result = await ratingController.update(calificacionId, {
            puntuacion: 4,
            comentario: 'Actualizado: buen servicio'
        }, CALIFICADOR_ID);

        assert.equal(result.puntuacion, 4);
        assert.equal(result.comentario, 'Actualizado: buen servicio');

        const dbResult = await pool.query('SELECT * FROM calificacion WHERE id = $1', [calificacionId]);
        assert.equal(dbResult.rows[0].puntuacion, 4);
        assert.equal(dbResult.rows[0].comentario, 'Actualizado: buen servicio');
    });

    it('debe rechazar actualizacion de otro usuario', async () => {
        await assert.rejects(
            () => ratingController.update(calificacionId, { puntuacion: 1 }, 'other-user-id'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );
    });

    it('debe reportar calificacion como inapropiada', async () => {
        const result = await ratingController.report(calificacionId, CALIFICADO_ID, 'Contenido inapropiado');
        assert.equal(result.reportado, true);
        assert.equal(result.motivo_reporte, 'Contenido inapropiado');
    });

    it('debe hacer soft-delete de calificacion', async () => {
        await ratingController.remove(calificacionId, CALIFICADOR_ID);

        const dbResult = await pool.query('SELECT activo FROM calificacion WHERE id = $1', [calificacionId]);
        assert.equal(dbResult.rows[0].activo, false);

        const result = await ratingController.getByUser(CALIFICADO_ID);
        assert.equal(result.length, 0);
    });
});
