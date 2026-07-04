const { v4: uuidv4 } = require('uuid');
const { NotFoundError, ForbiddenError, ValidationError } = require('shared');
const pagoRepository = require('../repositories/pagoRepository');

async function createCheckout(bookingId, userId, metodoPago) {
    const reserva = await pagoRepository.findReservaById(bookingId);
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
        monto: reserva.precio_total,
        metodoPago: metodoPago || 'tarjeta_credito',
        referenciaPasarela
    });

    return { pago_id: id, referencia: referenciaPasarela, monto: reserva.precio_total, estado: 'pendiente' };
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
        const pago = await pagoRepository.findByReferenciaPasarela(pagoId);
        if (!pago) return { message: 'Pago no encontrado' };

        const nuevoEstado = determinarEstado(payload.data?.status || payload.status);
        await pagoRepository.updateEstado(pago.id, nuevoEstado);
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

async function releaseFunds(pagoId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'liberado');
    return result || { message: 'Pago no encontrado o no está en estado retenido' };
}

async function refund(pagoId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'reembolsado');
    return result || { message: 'Pago no encontrado o no reembolsable' };
}

async function getDashboard() {
    return await pagoRepository.getDashboard();
}

module.exports = {
    createCheckout, handleWebhook, determinarEstado,
    getPaymentById, getPaymentsByBooking,
    releaseFunds, refund, getDashboard
};
