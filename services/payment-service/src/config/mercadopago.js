const { MercadoPagoConfig, Preference, Payment, Refund } = require('mercadopago');
const createServiceLogger = require('../../../../shared/logger');

const logger = createServiceLogger('mercadopago');

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
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
    logger.info('Mercado Pago SDK configurado correctamente');
    return true;
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
            success: `${process.env.GATEWAY_URL || 'http://localhost:3000'}/payments/success`,
            failure: `${process.env.GATEWAY_URL || 'http://localhost:3000'}/payments/failure`,
            pending: `${process.env.GATEWAY_URL || 'http://localhost:3000'}/payments/pending`
        },
        auto_return: 'approved'
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

module.exports = { configure, isConfigured, createPreference, getPayment, capturePayment, refundPayment };
