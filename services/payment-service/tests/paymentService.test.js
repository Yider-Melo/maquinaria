const assert = require('node:assert/strict');
const { describe, it, mock } = require('node:test');

const pool = require('../src/db');
const paymentService = require('../src/services/paymentService');

describe('createCheckout', () => {
    it('debe lanzar NotFoundError si la reserva no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => paymentService.createCheckout('no-existe', 'user-id'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar ForbiddenError si no es el arrendatario', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', arrendatario_id: 'otro-user', propietario_id: 'owner', precio_total: 100000, estado: 'confirmada' }]
        }));

        await assert.rejects(
            () => paymentService.createCheckout('b-1', 'user-id'),
            (err) => { assert.equal(err.statusCode, 403); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe lanzar ValidationError si la reserva no esta confirmada', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'b-1', arrendatario_id: 'user-id', propietario_id: 'owner', precio_total: 100000, estado: 'pendiente' }]
        }));

        await assert.rejects(
            () => paymentService.createCheckout('b-1', 'user-id'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );

        pool.query = originalQuery;
    });

    it('debe crear checkout y devolver referencia', async () => {
        const originalQuery = pool.query;
        let callCount = 0;
        pool.query = mock.fn((sql) => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({ rows: [{ id: 'b-1', arrendatario_id: 'user-id', propietario_id: 'owner', precio_total: 100000, estado: 'confirmada' }] });
            }
            if (callCount === 2) {
                return Promise.resolve({ rows: [], rowCount: 0 });
            }
            return Promise.resolve({ rows: [{ id: 'inserted-id' }], rowCount: 1 });
        });

        const result = await paymentService.createCheckout('b-1', 'user-id');
        assert.ok(result.pago_id);
        assert.ok(result.referencia);
        assert.ok(result.referencia.includes('RENTAMAQ-'));
        assert.equal(result.monto, 100000);
        assert.equal(result.estado, 'pendiente');

        pool.query = originalQuery;
    });

    it('debe retornar pago existente si ya hay uno activo', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('estado IN')) {
                return Promise.resolve({ rows: [{ id: 'existing-payment', estado: 'pendiente' }] });
            }
            return Promise.resolve({ rows: [{ id: 'b-1', arrendatario_id: 'user-id', propietario_id: 'owner', precio_total: 100000, estado: 'confirmada' }] });
        });

        const result = await paymentService.createCheckout('b-1', 'user-id');
        assert.equal(result.pago_id, 'existing-payment');
        assert.equal(result.estado, 'pendiente');

        pool.query = originalQuery;
    });
});

describe('handleWebhook', () => {
    it('debe procesar webhook con estructura MercadoPago (type/data)', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [], rowCount: 1 });
            }
            return Promise.resolve({ rows: [{ id: 'p-1', estado: 'procesando' }] });
        });

        const result = await paymentService.handleWebhook({
            type: 'payment',
            data: { id: 'REF-123', status: 'approved' }
        });
        assert.equal(result.message, 'Webhook procesado');

        pool.query = originalQuery;
    });

    it('debe retornar message si el pago no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        const result = await paymentService.handleWebhook({
            action: 'payment.updated',
            data: { id: 'no-existe' }
        });
        assert.equal(result.message, 'Pago no encontrado');

        pool.query = originalQuery;
    });

    it('debe retornar message si payload no tiene id', async () => {
        const result = await paymentService.handleWebhook({});
        assert.equal(result.message, 'Payload invalido');
    });
});

describe('determinarEstado', () => {
    it('debe mapear estados correctamente', () => {
        const { determinarEstado } = paymentService;
        assert.equal(determinarEstado('approved'), 'retenido');
        assert.equal(determinarEstado('rejected'), 'fallido');
        assert.equal(determinarEstado('refunded'), 'reembolsado');
        assert.equal(determinarEstado('desconocido'), 'procesando');
    });
});

describe('getPaymentById', () => {
    it('debe devolver pago si el usuario es parte', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'p-1', monto: 100000, estado: 'retenido' }]
        }));

        const result = await paymentService.getPaymentById('p-1', 'user-id');
        assert.equal(result.id, 'p-1');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si no encuentra', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => paymentService.getPaymentById('no-existe', 'user-id'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('getPaymentsByBooking', () => {
    it('debe devolver pagos con autorizacion', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({
            rows: [{ id: 'p-1', monto: 100000 }]
        }));

        const result = await paymentService.getPaymentsByBooking('b-1', 'user-id');
        assert.equal(result.length, 1);

        pool.query = originalQuery;
    });
});

describe('releaseFunds', () => {
    it('debe liberar fondos si el pago esta retenido', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [{ id: 'p-1', estado: 'liberado' }] });
            }
            return Promise.resolve({ rows: [{ usuario_id: 'u-1' }] });
        });

        const result = await paymentService.releaseFunds('p-1');
        assert.equal(result.estado, 'liberado');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si el pago no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => paymentService.releaseFunds('no-existe'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('refund', () => {
    it('debe reembolsar si el pago esta retenido', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn((sql) => {
            if (sql.includes('UPDATE')) {
                return Promise.resolve({ rows: [{ id: 'p-1', estado: 'reembolsado' }] });
            }
            return Promise.resolve({ rows: [{ usuario_id: 'u-1' }] });
        });

        const result = await paymentService.refund('p-1');
        assert.equal(result.estado, 'reembolsado');

        pool.query = originalQuery;
    });

    it('debe lanzar NotFoundError si el pago no existe', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 0 }));

        await assert.rejects(
            () => paymentService.refund('no-existe'),
            (err) => { assert.equal(err.statusCode, 404); return true; }
        );

        pool.query = originalQuery;
    });
});

describe('getDashboard', () => {
    it('debe devolver resumen y ultimos pagos', async () => {
        const originalQuery = pool.query;
        let callCount = 0;
        pool.query = mock.fn(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({
                    rows: [{ total_transacciones: '5', total_liberado: '100000', total_retenido: '50000', total_reembolsado: '20000', total_fallidos: '1' }]
                });
            }
            return Promise.resolve({ rows: [{ id: 'p-1' }] });
        });

        const result = await paymentService.getDashboard();
        assert.equal(result.resumen.total_transacciones, '5');
        assert.equal(result.ultimos_pagos.length, 1);

        pool.query = originalQuery;
    });
});
