const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { ValidationError, getInternalApiKey } = require('shared');
const notificacionRepository = require('../repositories/notificacionRepository');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const INTERNAL_API_KEY = getInternalApiKey();

function postToGateway(path, body) {
    const payload = JSON.stringify(body);
    const req = http.request(`${GATEWAY_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'x-api-key': INTERNAL_API_KEY
        }
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
}

// Avisa al usuario (vía WebSocket) que tiene una notificación nueva.
function notifyGatewayViaHttp(userId, tipo, titulo, mensaje, referenciaId, referenciaTipo) {
    postToGateway('/_ws/notify', { userId, tipo, titulo, mensaje, referencia_id: referenciaId, referencia_tipo: referenciaTipo });
}

// Emite un evento de refresco global para que las vistas se recarguen en vivo.
function broadcastRefreshViaHttp(tipo, referenciaId, referenciaTipo) {
    postToGateway('/_ws/broadcast', { tipo, referencia_id: referenciaId, referencia_tipo: referenciaTipo });
}

async function getUserEmail(userId) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${AUTH_SERVICE_URL}/internal/users/${userId}`, {
            headers: { 'x-api-key': INTERNAL_API_KEY },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!res.ok) return null;
        const body = await res.json();
        return body.data || null;
    } catch {
        return null;
    }
}

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

async function createNotification(userId, tipo, referenciaId, referenciaTipo, data = {}) {
    const template = MENSAJES[tipo];
    if (!template) return null;

    const { titulo, mensaje } = template(data);
    const id = uuidv4();

    await notificacionRepository.insert({ id, userId, tipo, titulo, mensaje, referenciaId, referenciaTipo });

    return { id, tipo, titulo, mensaje, referencia_id: referenciaId, referencia_tipo: referenciaTipo };
}

async function createNotificationDirect(userId, tipo, titulo, mensaje, referenciaId, referenciaTipo) {
    if (!userId || !tipo || !titulo || !mensaje) {
        throw new ValidationError('userId, tipo, titulo y mensaje son requeridos');
    }

    const id = uuidv4();
    await notificacionRepository.insert({ id, userId, tipo, titulo, mensaje, referenciaId, referenciaTipo });
    return { id, tipo, titulo, mensaje };
}

async function getNotificationsByUser(userId, page = 1, size = 20) {
    size = Math.min(size, 100);
    return await notificacionRepository.findByUser(userId, page, size);
}

async function getUnreadCount(userId) {
    return { no_leidas: await notificacionRepository.countUnread(userId) };
}

async function markAsRead(notificationId, userId) {
    await notificacionRepository.markAsRead(notificationId, userId);
    return { message: 'Notificación marcada como leída' };
}

async function markAllAsRead(userId) {
    await notificacionRepository.markAllAsRead(userId);
    return { message: 'Todas las notificaciones marcadas como leídas' };
}

module.exports = {
    createNotification, createNotificationDirect,
    getNotificationsByUser, getUnreadCount, markAsRead, markAllAsRead,
    TIPOS_NOTIFICACION, getUserEmail,
    notifyGatewayViaHttp, broadcastRefreshViaHttp
};
