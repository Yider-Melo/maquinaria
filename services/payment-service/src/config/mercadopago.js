const { MercadoPagoConfig, Preference, Payment, Refund } = require('mercadopago');
const createServiceLogger = require('../../../../shared/logger');

const logger = createServiceLogger('mercadopago');

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const PAYOUT_MODE = (process.env.PAYOUT_MODE || 'auto').toLowerCase();
const MERCADOPAGO_USER_ID = process.env.MERCADOPAGO_COLLECTOR_ID;

let client = null;

function isConfigured() {
    return !!ACCESS_TOKEN;
}

function configure() {
    if (!ACCESS_TOKEN) {
        logger.warn('MERCADOPAGO_ACCESS_TOKEN no configurado. Usando modo simulado.');
        return false;
    }
    client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    logger.info('Mercado Pago SDK configurado correctamente', {
        payoutMode: PAYOUT_MODE,
        hasCollectorId: !!MERCADOPAGO_USER_ID
    });
    return true;
}

const BANK_ID_MAP = {
    nequi: 'nequi',
    bancolombia: 'bancolombia_transfer',
    davivienda: 'davivienda_transfer',
    bbva: 'bbva_transfer',
    popular: 'popular_transfer',
    occidente: 'occidente_transfer',
    bogota: 'bogota_transfer',
    av_villas: 'av_villas_transfer',
    colpatria: 'colpatria_transfer',
    caja_social: 'caja_social_transfer'
};

async function getPaymentMethodIds() {
    if (!isConfigured()) return null;
    try {
        const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

async function createPreference({ externalReference, title, unitPrice, quantity, payerEmail, backUrls, notificationUrl }) {
    if (!isConfigured()) {
        return {
            id: `SIMULATED-${externalReference}`,
            init_point: null,
            sandbox_init_point: null,
            simulated: true
        };
    }

    const body = {
        items: [{ title, unit_price: Number(unitPrice), quantity: Number(quantity || 1), currency_id: 'COP' }],
        external_reference: externalReference,
        notification_url: notificationUrl,
        back_urls: backUrls || {
            success: `${process.env.PUBLIC_URL || 'http://localhost:4200'}/payments/success`,
            failure: `${process.env.PUBLIC_URL || 'http://localhost:4200'}/payments/failure`,
            pending: `${process.env.PUBLIC_URL || 'http://localhost:4200'}/payments/pending`
        }
    };

    if (payerEmail) {
        body.payer = { email: payerEmail };
    }

    if (process.env.PUBLIC_URL) {
        body.notification_url = `${process.env.PUBLIC_URL}/api/v1/payments/webhook`;
    }

    try {
        const preference = new Preference(client);
        const result = await preference.create({ body });
        logger.info('Preferencia MP creada:', { id: result.id, externalReference });
        return {
            id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point,
            simulated: false
        };
    } catch (err) {
        logger.error('Error creando preferencia MP:', { message: err.message, status: err.status, cause: err.cause });
        throw new Error('Error al crear el pago en Mercado Pago');
    }
}

async function getPayment(paymentId) {
    if (!isConfigured()) return null;
    try {
        const payment = new Payment(client);
        const result = await payment.get({ id: paymentId });
        return result;
    } catch (err) {
        logger.error('Error obteniendo pago MP:', { message: err.message });
        return null;
    }
}

async function capturePayment(paymentId) {
    if (!isConfigured()) return null;
    try {
        const payment = new Payment(client);
        const result = await payment.capture({ id: paymentId });
        logger.info('Pago capturado en MP:', { paymentId });
        return result;
    } catch (err) {
        logger.error('Error capturando pago MP:', { message: err.message });
        return null;
    }
}

async function refundPayment(paymentId) {
    if (!isConfigured()) return null;
    try {
        const refund = new Refund(client);
        const result = await refund.create({ payment_id: paymentId });
        logger.info('Reembolso procesado en MP:', { paymentId });
        return result;
    } catch (err) {
        logger.error('Error reembolsando pago MP:', { message: err.message });
        return null;
    }
}

async function createPayout({ amount, description, bankId, accountNumber, holderName, holderDocType, holderDocNumber, holderEmail, externalRef }) {
    if (!isConfigured()) {
        logger.warn('Payout simulado (sin token MP):', { amount, bankId });
        return { simulated: true, amount, bankId, message: 'Payout simulado' };
    }

    if (PAYOUT_MODE === 'simulated') {
        logger.info('PAYOUT_MODE=simulated:', { amount, bankId, externalRef });
        return { simulated: true, amount, bankId, message: 'Payout simulado' };
    }

    logger.info('PAYOUT_MODE=manual, registrar para pago manual:', { amount, bankId, externalRef });
    return {
        manual: true,
        amount,
        bankId,
        message: 'Pago debe realizarse manualmente por transferencia bancaria (Nequi/Bancolombia/etc.)'
    };
}

module.exports = { configure, isConfigured, createPreference, getPayment, capturePayment, refundPayment, createPayout, PAYOUT_MODE };
