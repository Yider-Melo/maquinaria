// Controlador de notificaciones.
// Gestiona plantillas de mensajes, creacion de notificaciones (directa o
// basada en eventos), consulta paginada y marcado como leidas.

const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { ValidationError } = require('shared');

// Tipos de notificacion soportados por el sistema
const TIPOS_NOTIFICACION = {
    NUEVA_RESERVA: 'nueva_reserva',
    RESERVA_CONFIRMADA: 'reserva_confirmada',
    RESERVA_RECHAZADA: 'reserva_rechazada',
    RESERVA_CANCELADA: 'reserva_cancelada',
    RESERVA_COMPLETADA: 'reserva_completada',
    PAGO_CONFIRMADO: 'pago_confirmado',
    PAGO_FALLIDO: 'pago_fallido',
    NUEVA_CALIFICACION: 'nueva_calificacion',
    RECORDATORIO: 'recordatorio'
};

// Plantillas de mensajes asociadas a cada tipo de notificacion
const MENSAJES = {
    [TIPOS_NOTIFICACION.NUEVA_RESERVA]: (data) => ({
        titulo: 'Nueva solicitud de reserva',
        mensaje: `Has recibido una nueva solicitud de reserva para tu maquinaria del ${data.fecha_inicio} al ${data.fecha_fin}`
    }),
    [TIPOS_NOTIFICACION.RESERVA_CONFIRMADA]: (data) => ({
        titulo: 'Reserva confirmada',
        mensaje: `Tu reserva del ${data.fecha_inicio} al ${data.fecha_fin} ha sido confirmada`
    }),
    [TIPOS_NOTIFICACION.RESERVA_RECHAZADA]: (data) => ({
        titulo: 'Reserva rechazada',
        mensaje: `Tu solicitud de reserva del ${data.fecha_inicio} al ${data.fecha_fin} ha sido rechazada`
    }),
    [TIPOS_NOTIFICACION.RESERVA_CANCELADA]: (data) => ({
        titulo: 'Reserva cancelada',
        mensaje: `La reserva del ${data.fecha_inicio} al ${data.fecha_fin} ha sido cancelada`
    }),
    [TIPOS_NOTIFICACION.RESERVA_COMPLETADA]: (data) => ({
        titulo: 'Reserva completada',
        mensaje: `La reserva del ${data.fecha_inicio} al ${data.fecha_fin} ha sido completada. ¡Califica tu experiencia!`
    }),
    [TIPOS_NOTIFICACION.PAGO_CONFIRMADO]: (data) => ({
        titulo: 'Pago confirmado',
        mensaje: `Tu pago de $${data.monto} por la reserva ha sido confirmado`
    }),
    [TIPOS_NOTIFICACION.PAGO_FALLIDO]: (data) => ({
        titulo: 'Pago fallido',
        mensaje: `El pago de $${data.monto} no pudo ser procesado. Intenta de nuevo`
    }),
    [TIPOS_NOTIFICACION.NUEVA_CALIFICACION]: () => ({
        titulo: 'Nueva calificación',
        mensaje: 'Has recibido una nueva calificación'
    }),
    [TIPOS_NOTIFICACION.RECORDATORIO]: (data) => ({
        titulo: 'Recordatorio de alquiler',
        mensaje: `Tu alquiler de maquinaria comienza el ${data.fecha_inicio}. ¡Prepárate!`
    })
};

// Crea una notificacion usando la plantilla correspondiente al tipo.
async function createNotification(userId, tipo, referenciaId, referenciaTipo, data = {}) {
    const template = MENSAJES[tipo];
    if (!template) return null;

    const { titulo, mensaje } = template(data);
    const id = uuidv4();

    await pool.query(
        `INSERT INTO notificacion (id, usuario_id, tipo, titulo, mensaje, referencia_id, referencia_tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, tipo, titulo, mensaje, referenciaId, referenciaTipo]
    );

    return { id, tipo, titulo, mensaje, referencia_id: referenciaId, referencia_tipo: referenciaTipo };
}

// Obtiene notificaciones de un usuario con paginacion y conteo de no leidas.
async function getNotificationsByUser(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM notificacion WHERE usuario_id = $1',
        [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
        `SELECT * FROM notificacion WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT $2 OFFSET $3`,
        [userId, size, offset]
    );

    const noLeidas = await pool.query(
        'SELECT COUNT(*) FROM notificacion WHERE usuario_id = $1 AND leida = false',
        [userId]
    );

    return {
        data: result.rows,
        total,
        no_leidas: parseInt(noLeidas.rows[0].count),
        page,
        size,
        totalPages: Math.ceil(total / size)
    };
}

// Marca una notificacion especifica como leida.
async function markAsRead(notificationId, userId) {
    await pool.query(
        `UPDATE notificacion SET leida = true, leida_en = CURRENT_TIMESTAMP
         WHERE id = $1 AND usuario_id = $2`,
        [notificationId, userId]
    );
    return { message: 'Notificación marcada como leída' };
}

// Marca todas las notificaciones de un usuario como leidas.
async function markAllAsRead(userId) {
    await pool.query(
        `UPDATE notificacion SET leida = true, leida_en = CURRENT_TIMESTAMP
         WHERE usuario_id = $1 AND leida = false`,
        [userId]
    );
    return { message: 'Todas las notificaciones marcadas como leídas' };
}

// Crea una notificacion directamente con titulo y mensaje explicitos
// (sin usar plantilla), usado por comunicacion interna entre servicios.
async function createNotificationDirect(userId, tipo, titulo, mensaje, referenciaId, referenciaTipo) {
    if (!userId || !tipo || !titulo || !mensaje) {
        throw new ValidationError('userId, tipo, titulo y mensaje son requeridos');
    }

    const id = uuidv4();
    await pool.query(
        `INSERT INTO notificacion (id, usuario_id, tipo, titulo, mensaje, referencia_id, referencia_tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, userId, tipo, titulo, mensaje, referenciaId, referenciaTipo]
    );
    return { id, tipo, titulo, mensaje };
}

module.exports = {
    createNotification,
    createNotificationDirect,
    getNotificationsByUser,
    markAsRead,
    markAllAsRead,
    TIPOS_NOTIFICACION
};
