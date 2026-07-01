const assert = require('node:assert/strict');
const { describe, it, before, after, mock } = require('node:test');

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_booking_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';
process.env.MACHINERY_SERVICE_URL = 'http://localhost:3002';

const pool = require('../db');
const axios = require('axios');
const { eventBus } = require('shared');
const bookingController = require('./bookingController');

eventBus.publishEvent = async () => {};

const ARRENDATARIO_ID = 'b0000001-0000-0000-0000-000000000001';
const PROPIETARIO_ID = 'b0000001-0000-0000-0000-000000000002';
const MAQUINARIA_ID = 'b0000001-0000-0000-0000-000000000010';

before(async () => {
    await pool.query('DELETE FROM reserva');
    await pool.query(`INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado) VALUES
        ('b0000001-0000-0000-0000-000000000020', '${MAQUINARIA_ID}', '${ARRENDATARIO_ID}', '${PROPIETARIO_ID}', '2025-06-01', '2025-06-05', 2000000, 'confirmada')`);
});

after(async () => {
    await pool.end();
});

describe('booking integration', () => {
    let bookingId;

    it('debe verificar disponibilidad de maquinaria', async () => {
        const result = await bookingController.checkAvailability(MAQUINARIA_ID, '2025-07-01', '2025-07-05');
        assert.equal(result.disponible, true);
        assert.deepEqual(result.fechas_no_disponibles, []);
    });

    it('debe detectar overlapping con reserva existente', async () => {
        const result = await bookingController.checkAvailability(MAQUINARIA_ID, '2025-06-02', '2025-06-04');
        assert.equal(result.disponible, false);
        assert.equal(result.fechas_no_disponibles.length, 1);
    });

    it('debe crear reserva exitosamente', async () => {
        const originalAxiosGet = axios.get;
        axios.get = mock.fn(() => Promise.resolve({
            data: { data: { propietario_id: PROPIETARIO_ID, precio_por_dia: 500000 } }
        }));

        const result = await bookingController.create({
            maquinaria_id: MAQUINARIA_ID,
            fecha_inicio: '2025-08-01',
            fecha_fin: '2025-08-03'
        }, ARRENDATARIO_ID);

        bookingId = result.id;
        assert.ok(result.id);
        assert.equal(result.estado, 'pendiente');
        assert.equal(result.arrendatario_id, ARRENDATARIO_ID);
        assert.equal(result.propietario_id, PROPIETARIO_ID);
        assert.equal(parseFloat(result.precio_total), 1500000);

        const dbResult = await pool.query('SELECT * FROM reserva WHERE id = $1', [result.id]);
        assert.equal(dbResult.rows.length, 1);
        assert.equal(dbResult.rows[0].estado, 'pendiente');

        axios.get = originalAxiosGet;
    });

    it('debe obtener reserva por ID', async () => {
        const result = await bookingController.getById(bookingId, ARRENDATARIO_ID);
        assert.equal(result.id, bookingId);
        assert.equal(result.estado, 'pendiente');
    });

    it('debe rechazar acceso a reserva de otro usuario', async () => {
        await assert.rejects(
            () => bookingController.getById(bookingId, 'otro-usuario-id'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );
    });

    it('debe listar reservas del arrendatario', async () => {
        const result = await bookingController.getByUser(ARRENDATARIO_ID, 1, 10);
        assert.equal(result.total, 2);
        assert.equal(result.data.length, 2);
    });

    it('debe listar reservas del propietario', async () => {
        const result = await bookingController.getByOwner(PROPIETARIO_ID, 1, 10);
        assert.equal(result.total, 2);
    });

    it('debe confirmar reserva (propietario)', async () => {
        const result = await bookingController.confirm(bookingId, PROPIETARIO_ID);
        assert.equal(result.estado, 'confirmada');

        const dbResult = await pool.query('SELECT estado FROM reserva WHERE id = $1', [bookingId]);
        assert.equal(dbResult.rows[0].estado, 'confirmada');
    });

    it('debe rechazar confirmacion si no es el propietario', async () => {
        await assert.rejects(
            () => bookingController.confirm(bookingId, ARRENDATARIO_ID),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );
    });

    it('debe rechazar confirmacion si no esta pendiente', async () => {
        await assert.rejects(
            () => bookingController.confirm(bookingId, PROPIETARIO_ID),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe completar reserva (propietario)', async () => {
        const result = await bookingController.complete(bookingId, PROPIETARIO_ID);
        assert.equal(result.estado, 'completada');
    });

    it('debe cancelar reserva (arrendatario)', async () => {
        const existingBooking = await pool.query(
            "SELECT id FROM reserva WHERE estado = 'pendiente' LIMIT 1"
        );
        if (existingBooking.rows.length > 0) {
            const result = await bookingController.cancel(existingBooking.rows[0].id, ARRENDATARIO_ID, 'Cambio de planes');
            assert.equal(result.estado, 'cancelada');
        }
    });
});
