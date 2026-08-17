const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { NotFoundError, ForbiddenError, ValidationError, eventBus, EVENT_TYPES, getInternalApiKey } = require('shared');
const pagoRepository = require('../repositories/pagoRepository');
const paymentProvider = require('../config/paymentProvider');
const createServiceLogger = require('../../../../shared/logger');

const logger = createServiceLogger('payment-service');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://api-gateway:3000';
const PUBLIC_URL = process.env.PUBLIC_URL || GATEWAY_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const INTERNAL_API_KEY = getInternalApiKey();
const COMISION_PLATAFORMA = parseFloat(process.env.COMISION_PLATAFORMA_PORCENTAJE || '10') / 100;
const { PROVIDER } = paymentProvider;

async function markBookingAsPaid(bookingId) {
    const url = `${BOOKING_SERVICE_URL}/internal/${bookingId}/mark-paid`;
    const MAX_INTENTOS = 3;
    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const body = await response.text();
            logger.info('markBookingAsPaid respuesta:', { status: response.status, body });
            if (response.ok) {
                return true;
            }
            logger.warn('markBookingAsPaid falló, reintentando:', { status: response.status, body, intento });
        } catch (err) {
            logger.warn('markBookingAsPaid error de conexión, reintentando:', { message: err.message, intento });
        }
        if (intento < MAX_INTENTOS) {
            await new Promise(resolve => setTimeout(resolve, 1000 * intento));
        }
    }
    logger.error('markBookingAsPaid agotó reintentos:', { bookingId });
    return false;
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

    // Evita pagos duplicados: si la reserva ya tiene un pago aprobado
    // (retenido o liberado), no se permite crear otro checkout.
    const pagoAprobado = await pagoRepository.findApprovedPaymentByBooking(bookingId);
    if (pagoAprobado) {
        throw new ValidationError('Esta reserva ya tiene un pago aprobado. Verifica el estado de tu reserva antes de intentar pagar de nuevo.');
    }

    const existingPayment = await pagoRepository.findActivePaymentByBooking(bookingId);
    let id, externalReference;

    if (existingPayment) {
        if (existingPayment.estado === 'retenido' || existingPayment.estado === 'liberado') {
            throw new ValidationError('Esta reserva ya tiene un pago aprobado. Verifica el estado de tu reserva antes de intentar pagar de nuevo.');
        }

        if (existingPayment.estado === 'pendiente' && existingPayment.checkout_url) {
            await reconciliarPago(existingPayment);
            const reconciliado = await pagoRepository.findActivePaymentByBooking(bookingId);
            if (reconciliado && (reconciliado.estado === 'retenido' || reconciliado.estado === 'liberado')) {
                throw new ValidationError('Esta reserva ya tiene un pago aprobado. Verifica el estado de tu reserva antes de intentar pagar de nuevo.');
            }
            if (reconciliado && reconciliado.checkout_url) {
                return {
                    pago_id: reconciliado.id,
                    checkout_url: reconciliado.checkout_url,
                    estado: reconciliado.estado,
                    referencia: reconciliado.referencia_pasarela,
                    monto: reserva.precio_total
                };
            }
        }

        id = existingPayment.id;
        externalReference = existingPayment.referencia_pasarela;
        if (existingPayment.checkout_url && !existingPayment.checkout_url.includes('mercadopago')
            && PROVIDER !== 'wompi') {
            return {
                pago_id: existingPayment.id,
                checkout_url: existingPayment.checkout_url,
                estado: existingPayment.estado
            };
        }
        await pagoRepository.updateEstado(existingPayment.id, 'fallido');
        id = uuidv4();
        externalReference = `RENTAMAQ-${id}`;
        await pagoRepository.insert({
            id, bookingId, userId,
            propietarioId: reserva.propietario_id,
            monto: reserva.precio_total,
            metodoPago: metodoPago || PROVIDER,
            referenciaPasarela: externalReference
        });
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
        notificationUrl: `${PUBLIC_URL}/api/v1/payments/webhook`,
        backUrls: {
            success: `${FRONTEND_URL}/payments/success?external_ref=${externalReference}`,
            failure: `${FRONTEND_URL}/payments/failure?external_ref=${externalReference}`,
            pending: `${FRONTEND_URL}/payments/pending?external_ref=${externalReference}`
        }
    });

    await pagoRepository.updateCheckoutUrl(id, preference.init_point || preference.wompi_id || preference.id);

    return {
        pago_id: id,
        referencia: externalReference,
        monto: reserva.precio_total,
        estado: 'pendiente',
        checkout_url: preference.init_point,
        transaction_id: preference.wompi_id || null,
        sandbox_checkout_url: preference.sandbox_init_point || null,
        simulated: preference.simulated || false,
        sandbox: paymentProvider.isSandboxMode(),
        proveedor: PROVIDER,
        message: preference.simulated
            ? 'Modo simulado.'
            : 'Redirigiendo para completar el pago...'
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

const TRANSICIONES_PAGO = {
    'retenido': ['pendiente', 'procesando'],
    'fallido': ['pendiente', 'procesando', 'retenido'],
    'reembolsado': ['pendiente', 'procesando', 'retenido'],
    'procesando': ['pendiente']
};

function transicionesValidas(nuevoEstado) {
    return TRANSICIONES_PAGO[nuevoEstado] || [];
}

async function handleWompiWebhook(payload) {
    const event = payload.event;
    const transaction = payload.data?.transaction;
    if (!transaction) return { message: 'Payload invalido' };

    const externalReference = transaction.reference;
    const status = transaction.status;
    const transactionId = transaction.id;

    let pago = null;
    if (externalReference && externalReference.startsWith('RENTAMAQ-')) {
        pago = await pagoRepository.findByReferenciaPasarela(externalReference);
    }
    const linkId = transaction.payment_link_id || transaction.link_id;
    if (!pago && linkId) {
        pago = await pagoRepository.findByWompiLinkId(linkId);
    }
    if (!pago) return { message: 'Pago no encontrado' };

    const result = await aplicarEstadoWompi(pago, status, transactionId);
    if (!result) return { message: 'Transición de estado no aplicable (webhook duplicado o estado final)' };
    return { message: 'Webhook procesado', estado: result.estado };
}

function estadoDesdeStatusWompi(status) {
    return status === 'APPROVED' ? 'retenido'
        : status === 'DECLINED' || status === 'ERROR' || status === 'VOIDED' ? 'fallido'
        : status === 'REFUNDED' ? 'reembolsado'
        : 'procesando';
}

// Aplica la transición de estado de un pago según el status de Wompi y,
// si quedó aprobado (retenido), marca la reserva como pagada.
async function aplicarEstadoWompi(pago, status, transactionId) {
    const nuevoEstado = estadoDesdeStatusWompi(status);
    const fromEstados = transicionesValidas(nuevoEstado);
    if (!fromEstados.length) return null;

    const updated = await pagoRepository.updateEstadoTransicion(pago.id, fromEstados, nuevoEstado);
    if (!updated) return null;

    await pagoRepository.updateReferenciaPasarela(pago.id, String(transactionId));
    pago.referencia_pasarela_mp = String(transactionId);

    if (nuevoEstado === 'retenido') {
        await markBookingAsPaid(pago.reserva_id);
    }

    try {
        eventBus.publishEvent(EVENT_TYPES.PAYMENT.UPDATED, { pago_id: pago.id, estado: nuevoEstado, reserva_id: pago.reserva_id });
    } catch { }
    return updated;
}

function extraerLinkIdWompi(checkoutUrl) {
    if (!checkoutUrl) return null;
    const match = String(checkoutUrl).match(/\/l\/([^/?#]+)$/);
    return match ? match[1] : null;
}

// Reconciliación contra Wompi para pagos que quedaron en 'pendiente' porque el
// webhook no llegó o porque la referencia del link no casó con la pasarela.
// En los links de pago Wompi la transacción usa una referencia autogenerada
// ("<linkId>_<timestamp>_<hash>") y el campo payment_link_id, así que se
// consulta la transacción por el link del checkout y se aplica el estado real.
async function reconciliarPago(pago) {
    if (!pago || pago.estado !== 'pendiente') return null;
    if (PROVIDER !== 'wompi') return null;

    const linkId = extraerLinkIdWompi(pago.checkout_url);
    if (!linkId) return null;

    const txn = await paymentProvider.getTransactionByLinkId(linkId);
    if (!txn) return null;

    return aplicarEstadoWompi(pago, txn.status, txn.id);
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
        const fromEstados = transicionesValidas(nuevoEstado);
        if (!fromEstados.length) return { message: 'Evento ignorado' };

        const updated = await pagoRepository.updateEstadoTransicion(pago.id, fromEstados, nuevoEstado);
        if (!updated) return { message: 'Transición de estado no aplicable (webhook duplicado o estado final)' };

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

async function getPaymentById(pagoId, userId, isAdmin = false) {
    const pago = isAdmin
        ? await pagoRepository.findByIdAdmin(pagoId)
        : await pagoRepository.findByIdWithReserva(pagoId, userId);
    if (!pago) {
        throw new NotFoundError('Pago no encontrado');
    }
    if (pago.estado === 'pendiente') {
        await reconciliarPago(pago);
        const actualizado = isAdmin
            ? await pagoRepository.findByIdAdmin(pagoId)
            : await pagoRepository.findByIdWithReserva(pagoId, userId);
        return actualizado || pago;
    }
    return pago;
}

async function getPaymentsByBooking(bookingId, userId) {
    const pagos = await pagoRepository.findByBooking(bookingId, userId);
    for (const pago of pagos) {
        if (pago.estado === 'pendiente') {
            await reconciliarPago(pago);
        }
    }
    if (pagos.some(p => p.estado === 'pendiente')) {
        return await pagoRepository.findByBooking(bookingId, userId);
    }
    return pagos;
}

async function getMyPayments(userId, page = 1, size = 20) {
    return await pagoRepository.findByUser(userId, page, size);
}

async function releaseFunds(pagoId, userId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.propietario_id !== userId) throw new ForbiddenError('Solo el propietario puede liberar fondos');

    if (pago.estado !== 'retenido') {
        throw new ValidationError('Solo se pueden liberar fondos de un pago en estado retenido');
    }

    if (pago.referencia_pasarela_mp) {
        const mpPaymentId = parseInt(pago.referencia_pasarela_mp, 10);
        if (!isNaN(mpPaymentId)) {
            await paymentProvider.capturePayment(mpPaymentId);
        }
    }

    const montoPropietario = Math.round(parseFloat(pago.monto || 0) * (1 - COMISION_PLATAFORMA));
    const comision = parseFloat(pago.monto || 0) - montoPropietario;

    await pagoRepository.updatePayoutInfo(pagoId, { comision, montoPropietario });

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'liberado');
    if (result) {
        await pagoRepository.insertMovimiento({
            pagoId, reservaId: pago.reserva_id,
            tipo: 'comision_plataforma',
            monto: comision,
            descripcion: `Comisión RentaMaq ${COMISION_PLATAFORMA * 100}% - Reserva ${(pago.reserva_id || '').substring(0, 8).toUpperCase()}`,
            referenciaTipo: 'reserva',
            referenciaId: pago.reserva_id
        });
        await pagoRepository.insertMovimiento({
            pagoId, reservaId: pago.reserva_id,
            tipo: 'pago_propietario',
            monto: montoPropietario,
            descripcion: `Pago a propietario - Reserva ${(pago.reserva_id || '').substring(0, 8).toUpperCase()} (liberado por el propietario)`,
            referenciaTipo: 'reserva',
            referenciaId: pago.reserva_id
        });
    }
    return result || { message: 'Pago no encontrado o no está en estado retenido' };
}

// Reembolsa el dinero en la pasarela real según el proveedor activo.
// Wompi usa el ID de transacción (string, p. ej. "1292-1602113476-10985") y
// el monto en centavos; MercadoPago usa el payment_id numérico.
async function reembolsarPasarela(pago) {
    if (!pago?.referencia_pasarela_mp) return false;
    const referencia = pago.referencia_pasarela_mp;
    const montoCents = Math.round(parseFloat(pago.monto || 0) * 100);

    if (PROVIDER === 'wompi') {
        const result = await paymentProvider.refundPayment(referencia, montoCents);
        if (!result) {
            logger.warn('No se pudo reembolsar en Wompi:', { referencia, pagoId: pago.id });
            return false;
        }
        return true;
    }

    const mpPaymentId = parseInt(referencia, 10);
    if (isNaN(mpPaymentId)) return false;
    await paymentProvider.refundPayment(mpPaymentId);
    return true;
}

async function refund(pagoId, userId) {
    const pago = await pagoRepository.findByIdSimple(pagoId);
    if (!pago) throw new NotFoundError('Pago no encontrado');
    if (pago.usuario_id !== userId && pago.propietario_id !== userId) throw new ForbiddenError('No tienes permiso para reembolsar este pago');

    await reembolsarPasarela(pago);

    const result = await pagoRepository.updateEstadoWhere(pagoId, 'retenido', 'reembolsado');
    if (result) {
        await pagoRepository.insertMovimiento({
            pagoId, reservaId: pago.reserva_id,
            tipo: 'reembolso',
            monto: pago.monto,
            descripcion: `Reembolso - Reserva ${(pago.reserva_id || '').substring(0, 8).toUpperCase()}`,
            referenciaTipo: 'reserva',
            referenciaId: pago.reserva_id
        });
        await enviarNotificacion(
            pago.usuario_id,
            EVENT_TYPES.PAYMENT.REFUNDED,
            pagoId,
            'Reembolso procesado',
            `Tu pago de $${pago.monto} fue reembolsado.`,
            { monto: pago.monto, pago_id: pagoId }
        );
    }
    return result || { message: 'Pago no encontrado o no reembolsable' };
}

async function refundByBooking(bookingId) {
    const pago = await pagoRepository.findPaymentByBooking(bookingId);
    if (!pago) {
        logger.warn('No hay pago reembolsable para la reserva:', { bookingId });
        return { message: 'No hay pago reembolsable para esta reserva' };
    }

    if (pago.referencia_pasarela_mp) {
        await reembolsarPasarela(pago);
    }

    const result = await pagoRepository.updateEstadoWhere(pago.id, 'retenido', 'reembolsado');
    if (result) {
        await pagoRepository.insertMovimiento({
            pagoId: pago.id,
            reservaId: bookingId,
            tipo: 'reembolso',
            monto: pago.monto,
            descripcion: `Reembolso por cancelación - Reserva ${(bookingId || '').substring(0, 8).toUpperCase()}`,
            referenciaTipo: 'reserva',
            referenciaId: bookingId
        });
        logger.info('Pago reembolsado por cancelación:', { pagoId: pago.id, bookingId });
        await enviarNotificacion(
            pago.usuario_id,
            EVENT_TYPES.PAYMENT.REFUNDED,
            pago.id,
            'Reembolso procesado',
            `Tu pago de $${pago.monto} por la reserva cancelada fue reembolsado.`,
            { monto: pago.monto, pago_id: pago.id }
        );
    }
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
            } else {
                await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'completado' });
                await pagoRepository.markPayoutCompleted(pago.id);
                logger.info('Payout real exitoso:', { propietarioId: pago.propietario_id, montoPropietario, banco: bankAccount.banco, wompiId: payoutResult.id });
            }
        } else {
            // La transferencia no se pudo crear en el proveedor: se registra como
            // fallido y los fondos permanecen retenidos para reintentarlo luego.
            payoutError = 'Error al crear la transferencia al propietario';
            await pagoRepository.updatePayoutInfo(pago.id, { payoutEstado: 'fallido', payoutError });
            logger.warn('Error creando la transferencia al propietario:', {
                propietarioId: pago.propietario_id,
                montoPropietario,
                banco: bankAccount.banco,
                bookingId
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

    const payoutExitoso = !!payoutResult;

    if (!payoutExitoso) {
        logger.warn('Payout fallido, los fondos permanecen retenidos:', {
            pagoId: pago.id,
            bookingId,
            propietarioId: pago.propietario_id,
            payoutError
        });
        try {
            eventBus.publishEvent(EVENT_TYPES.PAYMENT.RELEASED, {
                pago_id: pago.id,
                reserva_id: bookingId,
                monto_propietario: montoPropietario,
                comision,
                payout_realizado: false,
                payout_error: payoutError,
                propietario_id: pago.propietario_id
            });
        } catch { }
        return { success: false, message: 'Payout fallido. Los fondos permanecen retenidos para reintento.', payoutError };
    }

    const result = await pagoRepository.updateEstadoWhere(pago.id, 'retenido', 'liberado');
    if (result) {
        const payoutState = payoutResult.simulated ? 'simulado' : 'real';
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
            descripcion: `Pago a propietario - Reserva ${bookingId.substring(0, 8).toUpperCase()}`,
            referenciaTipo: 'reserva',
            referenciaId: bookingId
        });

        await enviarNotificacion(
            pago.propietario_id,
            EVENT_TYPES.PAYMENT.RELEASED,
            pago.id,
            'Pago recibido',
            `Recibiste el pago por tu alquiler por $${Number(montoPropietario).toLocaleString('es-CO')} COP (Reserva ${(bookingId || '').substring(0, 8).toUpperCase()}).`
        );
    }

    try {
        eventBus.publishEvent(EVENT_TYPES.PAYMENT.RELEASED, {
            pago_id: pago.id,
            reserva_id: bookingId,
            monto_propietario: montoPropietario,
            comision,
            payout_realizado: true,
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

// Completa los montos de comisión y pago al propietario cuando el registro aún
// no los tiene calculados (pagos liberados sin información de payout almacenada).
function completarMontosPayout(p) {
    const monto = parseFloat(p.monto || 0);
    const montoPropietario = p.monto_propietario != null
        ? parseFloat(p.monto_propietario)
        : Math.round(monto * (1 - COMISION_PLATAFORMA));
    const comision = p.comision != null
        ? parseFloat(p.comision)
        : monto - montoPropietario;
    return { ...p, monto_propietario: montoPropietario, comision };
}

async function getPendingPayouts() {
    const rows = await pagoRepository.findPendingPayouts();
    return rows.map(completarMontosPayout);
}

async function getFailedPayouts() {
    const rows = await pagoRepository.findFailedPayouts();
    return rows.map(completarMontosPayout);
}

async function enviarNotificacion(userId, tipo, referenciaId, titulo, mensaje, extra = {}) {
    const payload = { usuario_id: userId, tipo, titulo, mensaje, referencia_id: referenciaId, referencia_tipo: 'pago', ...extra };
    const publicado = await eventBus.publishEvent(tipo, payload);
    if (publicado) return;
    try {
        await fetch(`${NOTIFICATION_SERVICE_URL}/internal`, {
            method: 'POST',
            headers: { 'x-api-key': INTERNAL_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(3000)
        });
    } catch (err) {
        logger.warn('No se pudo enviar notificacion por HTTP', { tipo, error: err.message });
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
            tipo: 'admin'
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
            payout_tipo: 'admin',
            completado_por: adminUserId,
            completado_en: new Date().toISOString()
        }
    };
}

async function getDashboard(q) {
    return await pagoRepository.getDashboard(q, COMISION_PLATAFORMA);
}

async function findAllPaginated(page, size, q) {
    return await pagoRepository.findAllPaginated(page, size, q);
}

async function getPaymentsByMonth(mes, page = 1, size = 10, q) {
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
        throw new ValidationError('Mes inv�lido. Usa el formato YYYY-MM');
    }
    return await pagoRepository.findByMonth(mes, page, size, q);
}

async function getFailedPayments(page = 1, size = 10) {
    return await pagoRepository.findByEstado('fallido', page, size);
}

module.exports = {
    createCheckout, handleWebhook, determinarEstado,
    getPaymentById, getPaymentsByBooking, getMyPayments,
    simulateApproval, releaseFunds, refund, refundByBooking, releaseByBooking,
    retryPayout, getPendingPayouts, getFailedPayouts,
    markPayoutManuallyCompleted, getDashboard, getPaymentsByMonth,
    getFailedPayments, findAllPaginated
};
