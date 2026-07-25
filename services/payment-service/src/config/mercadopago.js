const mercadopago = require('mercadopago');
const createServiceLogger = require('../../../../shared/logger');

const logger = createServiceLogger('mercadopago');

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

function isConfigured() {
    return !!ACCESS_TOKEN;
}

function configure() {
    if (!ACCESS_TOKEN) {
        logger.warn('MERCADOPAGO_ACCESS_TOKEN no configurado. Usando modo simulado.');
        return false;
    }
    mercadopago.configure({ access_token: ACCESS_TOKEN });
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

    const preference = {
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
        preference.payer = { email: payerEmail };
    }

    try {
        const result = await mercadopago.preferences.create(preference);
        logger.info('Preferencia MP creada:', { id: result.body.id, externalReference });
        return {
            id: result.body.id,
            init_point: result.body.init_point,
            sandbox_init_point: result.body.sandbox_init_point,
            simulated: false
        };
    } catch (err) {
        logger.error('Error creando preferencia MP:', { message: err.message, status: err.status });
        throw new Error('Error al crear el pago en Mercado Pago');
    }
}

async function getPayment(paymentId) {
    if (!isConfigured()) return null;
    try {
        const result = await mercadopago.payment.get(paymentId);
        return result.body;
    } catch (err) {
        logger.error('Error obteniendo pago MP:', { message: err.message });
        return null;
    }
}

async function capturePayment(paymentId) {
    if (!isConfigured()) return null;
    try {
        const result = await mercadopago.payment.capture(paymentId);
        logger.info('Pago capturado en MP:', { paymentId });
        return result.body;
    } catch (err) {
        logger.error('Error capturando pago MP:', { message: err.message });
        return null;
    }
}

async function refundPayment(paymentId) {
    if (!isConfigured()) return null;
    try {
        const result = await mercadopago.refund.create(paymentId);
        logger.info('Reembolso procesado en MP:', { paymentId });
        return result.body;
    } catch (err) {
        logger.error('Error reembolsando pago MP:', { message: err.message });
        return null;
    }
}

module.exports = { configure, isConfigured, createPreference, getPayment, capturePayment, refundPayment };
