const assert = require('node:assert/strict');
const { describe, it, mock } = require('node:test');

const pool = require('../src/db');
const notificationService = require('../src/services/notificationService');

describe('createNotification', () => {
    it('debe crear notificacion usando plantilla', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 1 }));

        const result = await notificationService.createNotification(
            'user-id',
            notificationService.TIPOS_NOTIFICACION.NUEVA_RESERVA,
            'ref-1',
            'reserva',
            { fecha_inicio: '2025-01-01', fecha_fin: '2025-01-03' }
        );

        assert.ok(result.id);
        assert.equal(result.tipo, 'nueva_reserva');
        assert.equal(result.titulo, 'Nueva solicitud de reserva');
        assert.ok(result.mensaje.includes('2025-01-01'));

        pool.query = originalQuery;
    });

    it('debe retornar null si el tipo no tiene plantilla', async () => {
        const result = await notificationService.createNotification('user-id', 'tipo_invalido', 'ref-1', 'reserva');
        assert.equal(result, null);
    });
});

describe('createNotificationDirect', () => {
    it('debe lanzar ValidationError si faltan campos', async () => {
        await assert.rejects(
            () => notificationService.createNotificationDirect(null, 'tipo', 'titulo', 'mensaje'),
            (err) => { assert.equal(err.statusCode, 400); return true; }
        );
    });

    it('debe crear notificacion directamente', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 1 }));

        const result = await notificationService.createNotificationDirect(
            'user-id', 'reserva_confirmada', 'Reserva confirmada', 'Tu reserva ha sido confirmada'
        );

        assert.ok(result.id);
        assert.equal(result.titulo, 'Reserva confirmada');

        pool.query = originalQuery;
    });
});

describe('getNotificationsByUser', () => {
    it('debe devolver notificaciones paginadas con conteo de no leidas', async () => {
        const originalQuery = pool.query;
        let callCount = 0;
        pool.query = mock.fn((sql) => {
            callCount++;
            if (callCount === 1) return Promise.resolve({ rows: [{ count: '5' }] });
            if (callCount === 2) return Promise.resolve({ rows: [{ id: 'n-1' }, { id: 'n-2' }], rowCount: 2 });
            return Promise.resolve({ rows: [{ count: '2' }] });
        });

        const result = await notificationService.getNotificationsByUser('user-id', 1, 10);
        assert.equal(result.total, 5);
        assert.equal(result.data.length, 2);
        assert.equal(result.no_leidas, 2);
        assert.equal(result.totalPages, 1);

        pool.query = originalQuery;
    });
});

describe('markAsRead', () => {
    it('debe marcar notificacion como leida', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 1 }));

        const result = await notificationService.markAsRead('n-1', 'user-id');
        assert.equal(result.message, 'Notificación marcada como leída');

        pool.query = originalQuery;
    });
});

describe('markAllAsRead', () => {
    it('debe marcar todas como leidas', async () => {
        const originalQuery = pool.query;
        pool.query = mock.fn(() => Promise.resolve({ rows: [], rowCount: 5 }));

        const result = await notificationService.markAllAsRead('user-id');
        assert.equal(result.message, 'Todas las notificaciones marcadas como leídas');

        pool.query = originalQuery;
    });
});

describe('TIPOS_NOTIFICACION', () => {
    it('debe tener todos los tipos definidos', () => {
        const tipos = notificationService.TIPOS_NOTIFICACION;
        assert.equal(tipos.NUEVA_RESERVA, 'nueva_reserva');
        assert.equal(tipos.RESERVA_CONFIRMADA, 'reserva_confirmada');
        assert.equal(tipos.RESERVA_RECHAZADA, 'reserva_rechazada');
        assert.equal(tipos.RESERVA_CANCELADA, 'reserva_cancelada');
        assert.equal(tipos.RESERVA_COMPLETADA, 'reserva_completada');
        assert.equal(tipos.PAGO_CONFIRMADO, 'pago_confirmado');
        assert.equal(tipos.PAGO_FALLIDO, 'pago_fallido');
        assert.equal(tipos.NUEVA_CALIFICACION, 'nueva_calificacion');
        assert.equal(tipos.RECORDATORIO, 'recordatorio');
    });
});
