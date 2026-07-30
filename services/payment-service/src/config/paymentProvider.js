const createServiceLogger = require('../../../../shared/logger');
const logger = createServiceLogger('payment-provider');

const PROVIDER = (process.env.PAYMENT_PROVIDER || 'mercadopago').toLowerCase();

let provider;

function getProvider() {
    if (provider) return provider;

    if (PROVIDER === 'wompi') {
        provider = require('./wompi');
        logger.info('Proveedor de pagos: Wompi');
    } else {
        provider = require('./mercadopago');
        logger.info('Proveedor de pagos: MercadoPago');
    }

    provider.configure();
    return provider;
}

function isConfigured() {
    return getProvider().isConfigured();
}

function configure() {
    return getProvider().configure();
}

async function createPreference(options) {
    return getProvider().createPreference(options);
}

async function getPayment(paymentId) {
    const prov = getProvider();
    if (PROVIDER === 'wompi') {
        return prov.getTransaction(paymentId);
    }
    return prov.getPayment(paymentId);
}

async function capturePayment(paymentId) {
    const prov = getProvider();
    if (prov.capturePayment) {
        return prov.capturePayment(paymentId);
    }
    return null;
}

async function refundPayment(paymentId) {
    const prov = getProvider();
    if (prov.refundPayment) {
        return prov.refundPayment(paymentId);
    }
    return null;
}

async function createPayout(options) {
    const prov = getProvider();
    if (PROVIDER === 'wompi') {
        return prov.createTransfer({
            amount: options.amount,
            description: options.description,
            bankCode: options.bankId,
            accountNumber: options.accountNumber,
            accountType: 'SAVINGS',
            holderName: options.holderName,
            holderDocType: options.holderDocType,
            holderDocNumber: options.holderDocNumber,
            externalRef: options.externalRef
        });
    }
    return prov.createPayout(options);
}

module.exports = {
    getProvider,
    configure, isConfigured,
    createPreference, getPayment,
    capturePayment, refundPayment, createPayout,
    PROVIDER
};