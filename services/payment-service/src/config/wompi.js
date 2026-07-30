const createServiceLogger = require('../../../../shared/logger');
const logger = createServiceLogger('wompi');

const WOMPI_API = 'https://api.wompi.co/v1';

const PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
const PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;

function isConfigured() {
    return !!PUBLIC_KEY && !!PRIVATE_KEY;
}

function configure() {
    if (!PUBLIC_KEY || !PRIVATE_KEY) {
        logger.warn('WOMPI_PUBLIC_KEY o WOMPI_PRIVATE_KEY no configurados. Usando modo simulado.');
        return false;
    }
    logger.info('Wompi SDK configurado correctamente');
    return true;
}

async function getAcceptanceToken() {
    try {
        const response = await fetch(`${WOMPI_API}/merchants/${PUBLIC_KEY}`, {
            headers: { Authorization: `Bearer ${PRIVATE_KEY}` }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.data?.presigned_acceptance?.acceptance_token || null;
    } catch (err) {
        logger.error('Error obteniendo acceptance token:', { message: err.message });
        return null;
    }
}

const BANK_CODES_COLOMBIA = {
    nequi: 'NEQUI',
    bancolombia: '007',
    davivienda: '051',
    bbva: '013',
    popular: '002',
    occidente: '023',
    bogota: '001',
    av_villas: '105',
    colpatria: '040',
    caja_social: '019',
    itau: '1006',
    pichincha: '060',
    scotiabank: '025',
    gnb_sudameris: '012',
    falabella: '050'
};

async function createPreference({ externalReference, title, unitPrice, quantity, payerEmail, backUrls, notificationUrl }) {
    if (!isConfigured()) {
        return {
            id: `SIMULATED-${externalReference}`,
            init_point: null,
            simulated: true,
            wompi_id: null
        };
    }

    const amountInCents = Math.round(unitPrice * 100);

    try {
        const body = {
            name: title || 'Reserva RentaMaq',
            description: title || 'Pago de alquiler de maquinaria',
            amount_in_cents: amountInCents,
            currency: 'COP',
            reference: externalReference,
            redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/bookings`,
            single_use: true,
            collect_shipping: false
        };

        const response = await fetch(`${WOMPI_API}/payment_links`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        const errorText = JSON.stringify(result);

        if (!response.ok) {
            let errorDetail;
            try {
                const errObj = JSON.parse(errorText);
                errorDetail = errObj.error?.messages
                    ? Object.entries(errObj.error.messages).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
                    : errorText;
            } catch {
                errorDetail = errorText;
            }
            logger.error('Error creando link de pago Wompi:', { status: response.status, error: errorDetail });
            throw new Error(`Wompi rechazó el pago (${response.status}): ${errorDetail}`);
        }

        const linkId = result.data?.id;
        const checkoutUrl = `https://checkout.wompi.co/link/${linkId}`;

        logger.info('Link de pago Wompi creado:', { id: linkId, externalReference, checkoutUrl });

        return {
            id: linkId,
            init_point: checkoutUrl,
            sandbox_init_point: null,
            simulated: false,
            wompi_id: linkId
        };
    } catch (err) {
        if (err.message.includes('Wompi rechazó')) throw err;
        logger.error('Error creando link Wompi:', { message: err.message });
        throw new Error('Error al crear el link de pago en Wompi');
    }
}


async function getTransaction(transactionId) {
    try {
        const response = await fetch(`${WOMPI_API}/transactions/${transactionId}`, {
            headers: { Authorization: `Bearer ${PRIVATE_KEY}` }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.data;
    } catch (err) {
        logger.error('Error obteniendo transaccion Wompi:', { message: err.message });
        return null;
    }
}

async function createTransfer({ amount, description, bankCode, accountNumber, accountType, holderName, holderDocType, holderDocNumber, externalRef }) {
    if (!isConfigured()) {
        logger.warn('Wompi no configurado, transferencia simulada:', { amount, bankCode });
        return { simulated: true, amount, message: 'Transferencia simulada' };
    }

    try {
        const mappedBankCode = BANK_CODES_COLOMBIA[bankCode] || bankCode;

        const body = {
            amount_in_cents: Math.round(amount * 100),
            currency: 'COP',
            source_wallet_id: null,
            destination: {
                type: 'BANK_ACCOUNT',
                bank_code: mappedBankCode,
                bank_account_number: accountNumber,
                bank_account_type: accountType || 'SAVINGS',
                customer: {
                    name: holderName,
                    identification_type: holderDocType || 'CC',
                    identification_number: holderDocNumber
                }
            },
            reference: externalRef,
            description: description || 'Pago al propietario RentaMaq'
        };

        const response = await fetch(`${WOMPI_API}/transfers`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            logger.error('Error en transferencia Wompi:', { status: response.status, error: result });
            return null;
        }

        logger.info('Transferencia Wompi creada:', { id: result.data?.id, amount, bankCode });
        return { id: result.data?.id, status: result.data?.status, amount };
    } catch (err) {
        logger.error('Error creando transferencia Wompi:', { message: err.message });
        return null;
    }
}

async function getBankList() {
    try {
        const response = await fetch(`${WOMPI_API}/banks?public_key=${PUBLIC_KEY}`, {
            headers: { Authorization: `Bearer ${PRIVATE_KEY}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
    } catch (err) {
        logger.error('Error obteniendo bancos Wompi:', { message: err.message });
        return [];
    }
}

module.exports = {
    configure, isConfigured, createPreference, getTransaction,
    createTransfer, getBankList
};