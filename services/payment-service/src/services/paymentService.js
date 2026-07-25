const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { NotFoundError, ForbiddenError, ValidationError, eventBus, EVENT_TYPES } = require('shared');
const pagoRepository = require('../repositories/pagoRepository');
const mercadopago = require('../config/mercadopago');
const createServiceLogger = require('../../../../shared/logger');

const logger = createServiceLogger('payment-service');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:3000';
const PUBLIC_URL = process.env.PUBLIC_URL || GATEWAY_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || (logger.warn('INTERNAL_API_KEY no configurada. Usando clave por defecto (inseguro).'), 'rentamaq-internal-key-dev');

async function markBookingAsPaid(bookingId) {
    const url = `${BOOKING_SERVICE_URL}/internal/${bookingId}/mark-paid`;
    logger.info('markBookingAsPaid llamando a:', { url });
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' }
        });
        const body = await response.text();
        logger.info('markBookingAsPaid respuesta:', { status: response.status, body });
        if (!response.ok) {
            logger.warn('No se pudo marcar reserva como pagada:', { status: response.status, body });
        }
    } catch (err) {
        logger.warn('Error al notificar al booking-service:', { message: err.message });
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
    let id, externalReference;

    if (existingPayment) {
        id = existingPayment.id;
        externalReference = existingPayment.referencia_pasarela;
        if (existingPayment.checkout_url) {
            return {
                pago_id: existingPayment.id,
                checkout_url: existingPayment.checkout_url,
                estado: existingPayment.estado
            };
        }
    } else {
        id = uuidv4();
        externalReference = `RENTAMAQ-${id}`;
        await pagoRepository.insert({
            id, bookingId, userId,
            propietarioId: reserva.propietario_id,
            monto: reserva.precio_total,
            metodoPago: metodoPago || 'mercadopago',
            referenciaPasarela: externalReference
        });
    }

    const mpPreference = await mercadopago.createPreference({
        externalReference,
        title: `Reserva #${bookingId.substring(0, 8).toUpperCase()}`,
        unitPrice: reserva.precio_total,
        quantity: 1,
        payerEmail: reserva.arrendatario_email,
        notificationUrl: `${PUBLIC_URL}/api/v1/payments/webhook`,
        backUrls: {
            success: `${PUBLIC_URL}/payments/success?external_ref=${externalReference}`,
            failure: `${PUBLIC_URL}/payments/failure?external_ref=${externalReference}`,
            pending: `${PUBLIC_URL}/payments/pending?external_ref=${externalReference}`
        }
    });

    const checkoutUrl = mpPreference.init_point;
    await pagoRepository.updateCheckoutUrl(id, checkoutUrl);

    return {
        pago_id: id,
        referencia: externalReference,
        monto: reserva.precio_total,
        estado: 'pendiente',
        checkout_url: checkoutUrl,
        sandbox_checkout_url: mpPreference.sandbox_init_point,
        simulated: mpPreference.simulated,
        message: mpPreference.simulated
            ? 'Modo simulado. Usa simulate-approval para probar.'
            : 'Redirigiendo a Mercado Pago...'
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
    const mpPaymentId = payload.data?.id;
    if (!mpPaymentId) return { message: 'Payload invalido' };

    if (action === 'payment.created' || action === 'payment.updated' || action === 'payment') {
        let externalReference = payload.data?.external_reference;
        let status = payload.data?.status;

        if (!externalReference || !status) {
            const mpPayment = await mercadopago.getPayment(mpPaymentId);
            if (mpPayment) {
                externalReference = mpPayment.external_reference;
                status = mpPayment.status;
            }
        }

        if (!externalReference || !externalReference.startsWith('RENTAMAQ-')) {
            return { message: 'Referencia externa no reconocida' };
        }

        const pago = await pagoRepository.findByReferenciaPasarela(externalReference);
        if (!pago) return { message: 'Pago no encontrado' };

        const nuevoEstado = determinarEstado(status);
        await pagoRepository.updateEstado(pago.id, nuevoEstado);
        await pagoRepository.updateReferenciaPasarela(pago.id, String(mpPaymentId));
        pago.referencia_pasarela_mp = String(mpPaymentId);

        if (nuevoEstado === 'retenido') {
            await markBookingAsPaid(pago.reserva_id);
        }

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

async function getMyPayments(userId) {
    return await pagoRepository.findByUser(userId);
}

async function releaseFunds(pagoId, userId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.propietario_id !== userId) throw new ForbiddenError('Solo el propietario puede liberar fondos');

    if (pago.referencia_pasarela_mp) {
        const mpPaymentId = parseInt(pago.referencia_pasarela_mp, 10);
        if (!isNaN(mpPaymentId)) {
            await mercadopago.capturePayment(mpPaymentId);
        }
    }

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'liberado');
    return result || { message: 'Pago no encontrado o no está en estado retenido' };
}

async function refund(pagoId, userId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.usuario_id !== userId && pago.propietario_id !== userId) throw new ForbiddenError('No tienes permiso para reembolsar este pago');

    if (pago.referencia_pasarela_mp) {
        const mpPaymentId = parseInt(pago.referencia_pasarela_mp, 10);
        if (!isNaN(mpPaymentId)) {
            await mercadopago.refundPayment(mpPaymentId);
        }
    }

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'reembolsado');
    return result || { message: 'Pago no encontrado o no reembolsable' };
}

async function getDashboard() {
    return await pagoRepository.getDashboard();
}

module.exports = {
    createCheckout, handleWebhook, determinarEstado,
    getPaymentById, getPaymentsByBooking, getMyPayments,
    simulateApproval, releaseFunds, refund, getDashboard
};
