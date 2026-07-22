const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ForbiddenError, ValidationError, eventBus, EVENT_TYPES } = require('shared');
const pagoRepository = require('../repositories/pagoRepository');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || (console.warn('⚠️ INTERNAL_API_KEY no configurada. Usando clave por defecto (inseguro).'), 'rentamaq-internal-key-dev');

async function markBookingAsPaid(bookingId) {
    const url = `${BOOKING_SERVICE_URL}/internal/${bookingId}/mark-paid`;
    console.log('📤 markBookingAsPaid llamando a:', url);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' }
        });
        const body = await response.text();
        console.log('📥 markBookingAsPaid respuesta:', response.status, body);
        if (!response.ok) {
            console.warn('No se pudo marcar reserva como pagada:', response.status, body);
        }
    } catch (err) {
        console.warn('Error al notificar al booking-service:', err.message);
    }
}

async function findReservaById(bookingId) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${BOOKING_SERVICE_URL}/internal/${bookingId}`, {
            headers: { 'x-api-key': INTERNAL_API_KEY },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('No se pudo consultar la reserva');
        const body = await response.json();
        return body.data;
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Timeout al consultar la reserva');
        throw new Error('Error de conexión al servicio de reservas');
    }
}

async function createCheckout(bookingId, userId, metodoPago) {
    const reserva = await findReservaById(bookingId);
    if (!reserva) {
        throw new NotFoundError('Reserva no encontrada');
    }

    if (reserva.arrendatario_id !== userId) {
        throw new ForbiddenError('Solo el arrendatario puede iniciar el pago');
    }

    if (reserva.estado !== 'confirmada') {
        throw new ValidationError('La reserva debe estar confirmada para procesar el pago');
    }

    const existingPayment = await pagoRepository.findActivePaymentByBooking(bookingId);
    if (existingPayment) {
        return { pago_id: existingPayment.id, estado: existingPayment.estado };
    }

    const id = uuidv4();
    const referenciaPasarela = `RENTAMAQ-${id.substring(0, 8).toUpperCase()}`;

    await pagoRepository.insert({
        id, bookingId, userId,
        propietarioId: reserva.propietario_id,
        monto: reserva.precio_total,
        metodoPago: metodoPago || 'tarjeta_credito',
        referenciaPasarela
    });

    return {
        pago_id: id,
        referencia: referenciaPasarela,
        monto: reserva.precio_total,
        estado: 'pendiente',
        checkout_url: `/payments/${id}?ref=${referenciaPasarela}`,
        message: 'Checkout simulado creado. Confirma el pago para retener fondos.'
    };
}

async function simulateApproval(pagoId, userId) {
    const pago = await pagoRepository.findByIdWithReserva(pagoId, userId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.usuario_id !== userId) throw new ForbiddenError('Solo el pagador puede confirmar este pago');
    const result = await pagoRepository.updateEstadoWhere(pagoId, 'pendiente', 'retenido');
    await markBookingAsPaid(pago.reserva_id);
    return result || await pagoRepository.findByIdWithReserva(pagoId, userId);
}

function determinarEstado(status) {
    const map = {
        approved: 'retenido', authorized: 'retenido', in_process: 'procesando',
        in_mediation: 'procesando', rejected: 'fallido', cancelled: 'fallido',
        refunded: 'reembolsado', charged_back: 'reembolsado'
    };
    return map[status] || 'procesando';
}

async function handleWebhook(payload) {
    const action = payload.action || payload.type;
    const pagoId = payload.data?.id;
    if (!pagoId) return { message: 'Payload invalido' };

    if (action === 'payment.created' || action === 'payment.updated' || action === 'payment') {
        const pago = await pagoRepository.findByReferenciaPasarela(`RENTAMAQ-${pagoId}`);
        if (!pago) return { message: 'Pago no encontrado' };

        const nuevoEstado = determinarEstado(payload.data?.status || payload.status);
        await pagoRepository.updateEstado(pago.id, nuevoEstado);
        try {
            eventBus.publishEvent(EVENT_TYPES.PAYMENT.UPDATED, { pago_id: pago.id, estado: nuevoEstado, reserva_id: pago.reserva_id });
        } catch { }
        return { message: 'Webhook procesado', estado: nuevoEstado };
    }
}

async function getPaymentById(pagoId, userId) {
    const pago = await pagoRepository.findByIdWithReserva(pagoId, userId);
    if (!pago) {
        throw new NotFoundError('Pago no encontrado');
    }
    return pago;
}

async function getPaymentsByBooking(bookingId, userId) {
    return await pagoRepository.findByBooking(bookingId, userId);
}

async function releaseFunds(pagoId, userId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.propietario_id !== userId) throw new ForbiddenError('Solo el propietario puede liberar fondos');

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'liberado');
    return result || { message: 'Pago no encontrado o no está en estado retenido' };
}

async function refund(pagoId, userId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.usuario_id !== userId && pago.propietario_id !== userId) throw new ForbiddenError('No tienes permiso para reembolsar este pago');

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'reembolsado');
    return result || { message: 'Pago no encontrado o no reembolsable' };
}

async function getDashboard() {
    return await pagoRepository.getDashboard();
}

module.exports = {
    createCheckout, handleWebhook, determinarEstado,
    getPaymentById, getPaymentsByBooking,
    simulateApproval, releaseFunds, refund, getDashboard
};
