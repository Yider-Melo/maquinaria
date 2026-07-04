const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'rentamaq_notification_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = '0000';

const pool = require('../db');
const notificationService = require('../services/notificationService');

const USUARIO_ID = 'a0000000-0000-0000-0000-000000000003';
const REF_ID = 'a0000000-0000-0000-0000-000000000100';

before(async () => {
    await pool.query('DELETE FROM notificacion');
});

after(async () => {
    await pool.end();
});

describe('notification integration', () => {
    let notifId;

    it('debe crear notificacion usando plantilla', async () => {
        const result = await notificationService.createNotification(
            USUARIO_ID,
            notificationService.TIPOS_NOTIFICACION.NUEVA_RESERVA,
            REF_ID,
            'reserva',
            { fecha_inicio: '2025-07-01', fecha_fin: '2025-07-05' }
        );

        notifId = result.id;
        assert.ok(result.id);
        assert.equal(result.tipo, 'nueva_reserva');
        assert.equal(result.titulo, 'Nueva solicitud de reserva');
        assert.ok(result.mensaje.includes('2025-07-01'));

        const dbResult = await pool.query('SELECT * FROM notificacion WHERE id = $1', [result.id]);
        assert.equal(dbResult.rows.length, 1);
        assert.equal(dbResult.rows[0].leida, false);
    });

    it('debe crear notificacion directa', async () => {
        const result = await notificationService.createNotificationDirect(
            USUARIO_ID,
            'reserva_confirmada',
            'Reserva confirmada',
            'Tu reserva ha sido confirmada exitosamente',
            REF_ID,
            'reserva'
        );

        assert.ok(result.id);
        assert.equal(result.titulo, 'Reserva confirmada');
        assert.equal(result.mensaje, 'Tu reserva ha sido confirmada exitosamente');
    });

    it('debe retornar null si el tipo no tiene plantilla', async () => {
        const result = await notificationService.createNotification(
            USUARIO_ID, 'tipo_invalido', REF_ID, 'reserva'
        );
        assert.equal(result, null);
    });

    it('debe obtener notificaciones del usuario con paginacion', async () => {
        const result = await notificationService.getNotificationsByUser(USUARIO_ID, 1, 10);
        assert.equal(result.total, 2);
        assert.equal(result.data.length, 2);
        assert.equal(result.no_leidas, 2);
        assert.equal(result.totalPages, 1);
    });

    it('debe obtener pagina vacia si no hay mas resultados', async () => {
        const result = await notificationService.getNotificationsByUser(USUARIO_ID, 10, 10);
        assert.equal(result.total, 2);
        assert.equal(result.data.length, 0);
        assert.equal(result.totalPages, 1);
    });

    it('debe marcar una notificacion como leida', async () => {
        await notificationService.markAsRead(notifId, USUARIO_ID);

        const dbResult = await pool.query('SELECT leida, leida_en FROM notificacion WHERE id = $1', [notifId]);
        assert.equal(dbResult.rows[0].leida, true);
        assert.ok(dbResult.rows[0].leida_en);
    });

    it('debe marcar todas las notificaciones como leidas', async () => {
        await notificationService.markAllAsRead(USUARIO_ID);

        const noLeidas = await pool.query(
            'SELECT COUNT(*) FROM notificacion WHERE usuario_id = $1 AND leida = false',
            [USUARIO_ID]
        );
        assert.equal(parseInt(noLeidas.rows[0].count), 0);
    });

    it('debe reflejar no_leidas=0 despues de marcar todas', async () => {
        const result = await notificationService.getNotificationsByUser(USUARIO_ID, 1, 10);
        assert.equal(result.no_leidas, 0);
    });

    it('debe crear usando plantilla RESERVA_CONFIRMADA', async () => {
        const result = await notificationService.createNotification(
            USUARIO_ID,
            notificationService.TIPOS_NOTIFICACION.RESERVA_CONFIRMADA,
            REF_ID,
            'reserva',
            { fecha_inicio: '2025-08-01', fecha_fin: '2025-08-03' }
        );

        assert.equal(result.titulo, 'Reserva confirmada');
        assert.ok(result.mensaje.includes('confirmada'));
    });

    it('debe crear usando plantilla NUEVA_CALIFICACION sin data', async () => {
        const result = await notificationService.createNotification(
            USUARIO_ID,
            notificationService.TIPOS_NOTIFICACION.NUEVA_CALIFICACION,
            REF_ID,
            'calificacion'
        );

        assert.equal(result.titulo, 'Nueva calificación');
        assert.equal(result.mensaje, 'Has recibido una nueva calificación');
    });
});
