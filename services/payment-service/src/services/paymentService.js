const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { NotFoundError, ForbiddenError, ValidationError, eventBus, EVENT_TYPES } = require('shared');
const pagoRepository = require('../repositories/pagoRepository');
const paymentProvider = require('../config/paymentProvider');
const createServiceLogger = require('../../../../shared/logger');

const logger = createServiceLogger('payment-service');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:3000';
const PUBLIC_URL = process.env.PUBLIC_URL || GATEWAY_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || (logger.warn('INTERNAL_API_KEY no configurada. Usando clave por defecto (inseguro).'), 'rentamaq-internal-key-dev');
const COMISION_PLATAFORMA = parseFloat(process.env.COMISION_PLATAFORMA_PORCENTAJE || '10') / 100;
const { PROVIDER } = paymentProvider;

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
        if (existingPayment.checkout_url && !existingPayment.checkout_url.includes('mercadopago')) {
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
            metodoPago: metodoPago || PROVIDER,
            referenciaPasarela: externalReference
        });
    }

    const preference = await paymentProvider.createPreference({
        externalReference,
        title: `Reserva #${bookingId.substring(0, 8).toUpperCase()}`,
        unitPrice: reserva.precio_total,
        quantity: 1,
        payerEmail: reserva.arrendatario_email,
        notificationUrl: PROVIDER === 'wompi'
            ? `${PUBLIC_URL}/webhook`
            : `${PUBLIC_URL}/api/v1/payments/webhook`,
        backUrls: {
            success: `${PUBLIC_URL}/payments/success?external_ref=${externalReference}`,
            failure: `${PUBLIC_URL}/payments/failure?external_ref=${externalReference}`,
            pending: `${PUBLIC_URL}/payments/pending?external_ref=${externalReference}`
        }
    });

    await pagoRepository.updateCheckoutUrl(id, preference.id);

    return {
        pago_id: id,
        referencia: externalReference,
        monto: reserva.precio_total,
        estado: 'pendiente',
        checkout_url: preference.init_point,
        transaction_id: preference.wompi_id || null,
        sandbox_checkout_url: preference.sandbox_init_point || null,
        simulated: preference.simulated || false,
        proveedor: PROVIDER,
        message: preference.simulated
            ? 'Modo simulado.'
            : PROVIDER === 'wompi'
                ? 'Transaccion creada en Wompi. Procede con el checkout.'
                : 'Redirigiendo a Mercado Pago...'
    };
}

async function simulateApproval(pagoId, userId) {
    const pago = await pagoRepository.findByIdWithReserva(pagoId, userId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenError('simulate-approval solo disponible en modo desarrollo');
    }
    const result = await pagoRepository.updateEstadoWhere(pagoId, 'pendiente', 'retenido');
    if (!result) throw new ValidationError('El pago no esta en estado pendiente');
    await markBookingAsPaid(pago.reserva_id);
    return await pagoRepository.findByIdWithReserva(pagoId, userId);
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
    if (PROVIDER === 'wompi') {
        return handleWompiWebhook(payload);
    }
    return handleMpWebhook(payload);
}

async function handleWompiWebhook(payload) {
    const event = payload.event;
    const transaction = payload.data?.transaction;
    if (!transaction) return { message: 'Payload invalido' };

    const externalReference = transaction.reference;
    const status = transaction.status;
    const transactionId = transaction.id;

    if (!externalReference || !externalReference.startsWith('RENTAMAQ-')) {
        return { message: 'Referencia externa no reconocida' };
    }

    const pago = await pagoRepository.findByReferenciaPasarela(externalReference);
    if (!pago) return { message: 'Pago no encontrado' };

    const nuevoEstado = status === 'APPROVED' ? 'retenido'
        : status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED' ? 'fallido'
        : status === 'REFUNDED' ? 'reembolsado'
        : 'procesando';

    await pagoRepository.updateEstado(pago.id, nuevoEstado);
    await pagoRepository.updateReferenciaPasarela(pago.id, String(transactionId));
    pago.referencia_pasarela_mp = String(transactionId);

    if (nuevoEstado === 'retenido') {
        await markBookingAsPaid(pago.reserva_id);
    }

    try {
        eventBus.publishEvent(EVENT_TYPES.PAYMENT.UPDATED, { pago_id: pago.id, estado: nuevoEstado, reserva_id: pago.reserva_id });
    } catch { }
    return { message: 'Webhook procesado', estado: nuevoEstado };
}

async function handleMpWebhook(payload) {
    const action = payload.action || payload.type;
    const mpPaymentId = payload.data?.id;
    if (!mpPaymentId) return { message: 'Payload invalido' };

    if (action === 'payment.created' || action === 'payment.updated' || action === 'payment') {
        let externalReference = payload.data?.external_reference;
        let status = payload.data?.status;

        if (!externalReference || !status) {
            const mpPayment = await paymentProvider.getPayment(mpPaymentId);
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
    return { message: 'Evento ignorado' };
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
            await paymentProvider.capturePayment(mpPaymentId);
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
            await paymentProvider.refundPayment(mpPaymentId);
        }
    }

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'reembolsado');
    return result || { message: 'Pago no encontrado o no reembolsable' };
}

async function getOwnerBankAccount(ownerId) {
    try {
        const url = `${AUTH_SERVICE_URL}/internal/users/${ownerId}/bank-account`;
        const response = await fetch(url, {
            headers: { 'x-api-key': INTERNAL_API_KEY }
        });
        if (!response.ok) return null;
        const body = await response.json();
        return body.data || null;
    } catch (err) {
        logger.warn('Error obteniendo cuenta bancaria del propietario:', { message: err.message });
        return null;
    }
}

async function releaseByBooking(bookingId) {
    const pago = await pagoRepository.findPaymentByBooking(bookingId);
    if (!pago) {
        logger.warn('No hay pago en estado retenido para la reserva:', { bookingId });
        return { message: 'No hay pago pendiente de liberación' };
    }

    if (pago.referencia_pasarela_mp) {
        const mpPaymentId = parseInt(pago.referencia_pasarela_mp, 10);
        if (!isNaN(mpPaymentId)) {
            await paymentProvider.capturePayment(mpPaymentId);
        }
    }

    const montoPropietario = Math.round(pago.monto * (1 - COMISION_PLATAFORMA));
    const comision = pago.monto - montoPropietario;

    await pagoRepository.updatePayoutInfo(pago.id, {
        comision,
        montoPropietario,
        payoutEstado: 'procesando',
        payoutError: null
    });

    let payoutResult = null;
    let payoutError = null;
    const bankAccount = await getOwnerBankAccount(pago.propietario_id);

    if (bankAccount) {
        payoutResult = await paymentProvider.createPayout({
            amount: montoPropietario,
            description: `Pago alquiler - Reserva ${bookingId.substring(0, 8).toUpperCase()}`,
            bankId: bankAccount.banco,
            accountNumber: bankAccount.numero_cuenta,
            holderName: bankAccount.titular,
            holderDocType: bankAccount.tipo_documento,
            holderDocNumber: bankAccount.numero_documento,
            holderEmail: bankAccount.email || '',
            externalRef: `PAYOUT-${pago.id}`
        });

        if (payoutResult) {
            if (payoutResult.simulated) {
                await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'simulado' });
                await pagoRepository.markPayoutCompleted(pago.id);
                logger.info('Payout simulado OK (desarrollo):', { propietarioId: pago.propietario_id, montoPropietario, banco: bankAccount.banco });
            } else if (payoutResult.manual) {
                await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'manual' });
                logger.info('Payout en modo manual:', { propietarioId: pago.propietario_id, montoPropietario, banco: bankAccount.banco });
            } else {
                await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'completado' });
                await pagoRepository.markPayoutCompleted(pago.id);
                logger.info('Payout real exitoso en MP:', { propietarioId: pago.propietario_id, montoPropietario, banco: bankAccount.banco, mpId: payoutResult.id });
            }
        } else {
            payoutError = 'Payout rechazado por MercadoPago o error de conexión';
            await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'fallido', payoutError });
            logger.warn('Payout a propietario FALLÓ:', {
                propietarioId: pago.propietario_id,
                montoPropietario,
                banco: bankAccount.banco,
                bookingId,
                mensaje: payoutError
            });
        }
    } else {
        payoutError = 'Propietario sin cuenta bancaria registrada';
        await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'fallido', payoutError });
        logger.warn('Propietario sin cuenta bancaria registrada:', {
            propietarioId: pago.propietario_id,
            montoPropietario,
            bookingId
        });
    }

    const result = await pagoRepository.updateEstadoWhere(pago.id, 'retenido', 'liberado');
    if (result) {
        const payoutState = payoutResult
            ? (payoutResult.simulated ? 'simulado' : payoutResult.manual ? 'manual' : 'real')
            : 'fallido';
        logger.info('Fondos liberados:', {
            pagoId: pago.id,
            bookingId,
            montoPropietario,
            comision,
            payout: payoutState,
            banco: bankAccount?.banco || 'sin-banco'
        });

        await pagoRepository.insertMovimiento({
            pagoId: pago.id,
            reservaId: bookingId,
            tipo: 'comision_plataforma',
            monto: comision,
            descripcion: `Comisión RentaMaq ${COMISION_PLATAFORMA * 100}% - Reserva ${bookingId.substring(0, 8).toUpperCase()}`,
            referenciaTipo: 'reserva',
            referenciaId: bookingId
        });

        await pagoRepository.insertMovimiento({
            pagoId: pago.id,
            reservaId: bookingId,
            tipo: 'pago_propietario',
            monto: montoPropietario,
            descripcion: `Pago a propietario - Reserva ${bookingId.substring(0, 8).toUpperCase()}${payoutResult ? '' : ' (pendiente de transferencia)'}`,
            referenciaTipo: 'reserva',
            referenciaId: bookingId
        });
    }

    try {
        eventBus.publishEvent(EVENT_TYPES.PAYMENT.RELEASED, {
            pago_id: pago.id,
            reserva_id: bookingId,
            monto_propietario: montoPropietario,
            comision,
            payout_realizado: !!payoutResult,
            propietario_id: pago.propietario_id
        });
    } catch { }

    return result || { message: 'Pago no encontrado o no está en estado retenido' };
}

async function retryPayout(pagoId, adminUserId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');

    if (!pago.comision && !pago.monto_propietario) {
        const montoPropietario = Math.round(parseFloat(pago.monto || 0) * (1 - COMISION_PLATAFORMA));
        const comision = parseFloat(pago.monto || 0) - montoPropietario;
        await pagoRepository.updatePayoutInfo(pagoId, { comision, montoPropietario });
    }

    if (PROVIDER === 'mercadopago') {
        return { success: true, message: 'Payout en modo manual. Usa POST /admin/payouts/:id/mark-completed luego de transferir.' };
    }

    const bookingId = pago.reserva_id;
    const montoPropietario = parseFloat(pago.monto_propietario) || 0;
    const bankAccount = await getOwnerBankAccount(pago.propietario_id);

    if (!bankAccount) {
        await pagoRepository.updatePayoutInfo(pagoId, {
            payoutEstado: 'fallido',
            payoutError: 'Propietario sin cuenta bancaria registrada'
        });
        throw new ValidationError('El propietario no tiene cuenta bancaria registrada');
    }

    const payoutResult = await paymentProvider.createPayout({
        amount: montoPropietario,
        description: `Pago alquiler (reintento) - ${(bookingId || pagoId).substring(0, 8).toUpperCase()}`,
        bankId: bankAccount.banco,
        accountNumber: bankAccount.numero_cuenta,
        holderName: bankAccount.titular,
        holderDocType: bankAccount.tipo_documento,
        holderDocNumber: bankAccount.numero_documento,
        holderEmail: bankAccount.email || '',
        externalRef: `PAYOUT-RETRY-${pagoId}-${Date.now()}`
    });

    if (payoutResult) {
        if (payoutResult.simulated) {
            await pagoRepository.updatePayoutInfo(pagoId, { payoutEstado: 'simulado', payoutError: null });
        } else {
            await pagoRepository.markPayoutCompleted(pagoId);
            await pagoRepository.updatePayoutInfo(pagoId, { payoutEstado: 'completado', payoutError: null });
        }
        logger.info('Reintento de payout:', { pagoId, propietarioId: pago.propietario_id, resultado: payoutResult });
        return { success: true, message: 'Payout procesado', payoutResult };
    } else {
        await pagoRepository.updatePayoutInfo(pagoId, {
            payoutEstado: 'fallido',
            payoutError: 'Reintento falló'
        });
        throw new Error('El reintento de payout falló');
    }
}

async function getPendingPayouts() {
    return await pagoRepository.findPendingPayouts();
}

async function getFailedPayouts() {
    return await pagoRepository.findFailedPayouts();
}

async function enviarNotificacion(userId, tipo, referenciaId, titulo, mensaje) {
    const payload = { usuario_id: userId, tipo, titulo, mensaje, referencia_id: referenciaId, referencia_tipo: 'pago' };
    try {
        await eventBus.publishEvent(tipo, payload);
    } catch {
        try {
            await fetch(`${NOTIFICATION_SERVICE_URL}/internal`, {
                method: 'POST',
                headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch { }
    }
}

async function markPayoutManuallyCompleted(pagoId, adminUserId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');

    if (pago.payout_estado === 'completado') {
        throw new ValidationError('Este pago ya fue completado');
    }

    await pagoRepository.markPayoutCompleted(pagoId);
    await pagoRepository.updatePayoutInfo(pagoId, { payoutEstado: 'completado', payoutError: null });

    const montoPropietario = parseFloat(pago.monto_propietario) || 0;
    const montoTotal = parseFloat(pago.monto) || 0;
    const comision = parseFloat(pago.comision) || 0;

    await enviarNotificacion(
        pago.propietario_id,
        EVENT_TYPES.PAYMENT.RELEASED,
        pagoId,
        'Pago recibido',
        `Hemos recibido la confirmación del pago a tu cuenta por $${montoPropietario.toLocaleString('es-CO')} COP (Reserva ${(pago.reserva_id || '').substring(0, 8).toUpperCase()}).`
    );

    logger.info('Admin marcó payout como completado manualmente:', { pagoId, adminUserId, montoPropietario });

    try {
        eventBus.publishEvent(EVENT_TYPES.PAYMENT.RELEASED, {
            pago_id: pago.id,
            reserva_id: pago.reserva_id,
            monto_propietario: montoPropietario,
            comision,
            payout_realizado: true,
            tipo: 'manual'
        });
    } catch { }

    return {
        success: true,
        message: 'Payout marcado como completado',
        comprobante: {
            pago_id: pagoId,
            reserva_id: pago.reserva_id,
            propietario_id: pago.propietario_id,
            monto_total: montoTotal,
            comision,
            monto_propietario: montoPropietario,
            payout_estado: 'completado',
            payout_tipo: 'manual',
            completado_por: adminUserId,
            completado_en: new Date().toISOString()
        }
    };
}

async function getDashboard() {
    return await pagoRepository.getDashboard();
}

module.exports = {
    createCheckout, handleWebhook, determinarEstado,
    getPaymentById, getPaymentsByBooking, getMyPayments,
    simulateApproval, releaseFunds, refund, releaseByBooking,
    retryPayout, getPendingPayouts, getFailedPayouts,
    markPayoutManuallyCompleted, getDashboard
};
