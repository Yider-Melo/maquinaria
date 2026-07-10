const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');
const { v4: uuidv4 } = require('uuid');

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_payment_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';

const pool = require('../src/db');
const paymentService = require('../src/services/paymentService');

const MAQUINARIA_ID = 'a0000000-0000-0000-0000-000000000200';
const ARRENDATARIO_ID = 'a0000000-0000-0000-0000-000000000003';
const PROPIETARIO_ID = 'a0000000-0000-0000-0000-000000000002';
const RESERVA_ID = 'a0000000-0000-0000-0000-000000000100';

before(async () => {
    await pool.query('DELETE FROM pago');
    await pool.query('DELETE FROM reserva');
    await pool.query(
        `INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado)
         VALUES ($1, $2, $3, $4, '2025-07-01', '2025-07-05', 2000000, 'confirmada')`,
        [RESERVA_ID, MAQUINARIA_ID, ARRENDATARIO_ID, PROPIETARIO_ID]
    );
});

after(async () => {
    await pool.end();
});

describe('payment integration', () => {
    let pagoId;

    it('debe crear checkout para reserva confirmada', async () => {
        const result = await paymentService.createCheckout(RESERVA_ID, ARRENDATARIO_ID, 'tarjeta_credito');

        pagoId = result.pago_id;
        assert.ok(result.pago_id);
        assert.ok(result.referencia.startsWith('RENTAMAQ-'));
        assert.equal(result.monto, '2000000.00');
        assert.equal(result.estado, 'pendiente');

        const dbResult = await pool.query('SELECT * FROM pago WHERE id = $1', [result.pago_id]);
        assert.equal(dbResult.rows.length, 1);
        assert.equal(dbResult.rows[0].estado, 'pendiente');
        assert.equal(parseFloat(dbResult.rows[0].monto), 2000000);
    });

    it('debe rechazar checkout si la reserva no esta confirmada', async () => {
        const otraReserva = uuidv4();
        await pool.query(
            `INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado)
             VALUES ($1, $2, $3, $4, '2025-08-01', '2025-08-03', 500000, 'pendiente')`,
            [otraReserva, MAQUINARIA_ID, ARRENDATARIO_ID, PROPIETARIO_ID]
        );

        await assert.rejects(
            () => paymentService.createCheckout(otraReserva, ARRENDATARIO_ID),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe rechazar checkout si no es el arrendatario', async () => {
        await assert.rejects(
            () => paymentService.createCheckout(RESERVA_ID, PROPIETARIO_ID),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );
    });

    it('debe retornar pago existente si ya hay uno activo', async () => {
        const result = await paymentService.createCheckout(RESERVA_ID, ARRENDATARIO_ID);
        assert.equal(result.pago_id, pagoId);
        assert.equal(result.estado, 'pendiente');
    });

    it('debe procesar webhook y actualizar estado a retenido', async () => {
        const dbPago = await pool.query('SELECT referencia_pasarela FROM pago WHERE id = $1', [pagoId]);
        const referencia = dbPago.rows[0].referencia_pasarela;

        const result = await paymentService.handleWebhook({
            action: 'payment.updated',
            data: { id: referencia, status: 'approved' }
        });

        assert.equal(result.message, 'Webhook procesado');
        assert.equal(result.estado, 'retenido');

        const dbAfter = await pool.query('SELECT estado FROM pago WHERE id = $1', [pagoId]);
        assert.equal(dbAfter.rows[0].estado, 'retenido');
    });

    it('debe obtener pago por ID', async () => {
        const result = await paymentService.getPaymentById(pagoId, ARRENDATARIO_ID);
        assert.equal(result.id, pagoId);
        assert.equal(result.estado, 'retenido');
        assert.ok(result.maquinaria_id);
    });

    it('debe obtener pagos por reserva', async () => {
        const result = await paymentService.getPaymentsByBooking(RESERVA_ID, ARRENDATARIO_ID);
        assert.equal(result.length, 1);
        assert.equal(result[0].id, pagoId);
    });

    it('debe liberar fondos al propietario', async () => {
        const result = await paymentService.releaseFunds(pagoId);
        assert.equal(result.estado, 'liberado');

        const dbAfter = await pool.query('SELECT estado FROM pago WHERE id = $1', [pagoId]);
        assert.equal(dbAfter.rows[0].estado, 'liberado');
    });

    it('debe obtener dashboard con metricas', async () => {
        const dashboard = await paymentService.getDashboard();
        assert.ok(dashboard.resumen);
        assert.equal(parseInt(dashboard.resumen.total_transacciones), 1);
        assert.equal(parseFloat(dashboard.resumen.total_liberado), 2000000);
        assert.equal(dashboard.ultimos_pagos.length, 1);
    });

    it('debe reembolsar pago', async () => {
        const pagoLiberado = uuidv4();
        const otraReserva = uuidv4();
        await pool.query(
            `INSERT INTO reserva (id, maquinaria_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, precio_total, estado)
             VALUES ($1, $2, $3, $4, '2025-09-01', '2025-09-03', 300000, 'confirmada')`,
            [otraReserva, MAQUINARIA_ID, ARRENDATARIO_ID, PROPIETARIO_ID]
        );
        await pool.query(
            `INSERT INTO pago (id, reserva_id, usuario_id, monto, estado, referencia_pasarela)
             VALUES ($1, $2, $3, 300000, 'retenido', 'REF-TEST-002')`,
            [pagoLiberado, otraReserva, ARRENDATARIO_ID]
        );

        const result = await paymentService.refund(pagoLiberado);
        assert.equal(result.estado, 'reembolsado');

        const dbAfter = await pool.query('SELECT estado FROM pago WHERE id = $1', [pagoLiberado]);
        assert.equal(dbAfter.rows[0].estado, 'reembolsado');
    });
});
