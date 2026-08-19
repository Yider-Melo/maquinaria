const createServiceLogger = require('../../../../shared/logger');
const logger = createServiceLogger('wompi');

const PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;
const PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;
// Credenciales del producto 'Pagos a terceros' (Payouts). Son distintas a las
// llaves de cobro y se obtienen en: dashboard -> Desarrollo -> Programadores ->
// Pagos a Terceros. Se envían en los headers x-api-key y user-principal-id.
const PAYOUTS_API_KEY = process.env.WOMPI_PAYOUTS_API_KEY || null;
const PAYOUTS_USER_PRINCIPAL_ID = process.env.WOMPI_PAYOUTS_USER_PRINCIPAL_ID || null;
// Cuenta origen (Wompi Cuenta o bancaria vinculada) para las dispersiones.
// Si no se configura, se descubre con GET /accounts.
const PAYOUTS_ACCOUNT_ID = process.env.WOMPI_PAYOUTS_ACCOUNT_ID || null;

const IS_SANDBOX = (PUBLIC_KEY || '').startsWith('pub_test_');
const WOMPI_API = IS_SANDBOX ? 'https://sandbox.wompi.co/v1' : 'https://api.wompi.co/v1';
const PAYOUTS_API = IS_SANDBOX ? 'https://api.sandbox.payouts.wompi.co/v1' : 'https://api.payouts.wompi.co/v1';

function isConfigured() {
    return !!PUBLIC_KEY && !!PRIVATE_KEY;
}

function isSandboxMode() {
    return IS_SANDBOX;
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
        const checkoutUrl = `https://checkout.wompi.co/l/${linkId}`;

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

// Devuelve la transaccion mas reciente asociada a un link de pago (payment_link_id).
// Los webhooks de Wompi para links de pago llegan con referencia autogenerada
// (p. ej. "<linkId>_<timestamp>_<hash>") en vez del external reference propio,
// asi que esta consulta permite reconciliar pagos que el webhook no pudo casar.
// Nota: el endpoint de transacciones ignora los filtros por query, por lo que se
// recuperan las transacciones del rango y se filtran localmente por link/referencia.
async function getTransactionsByLink(linkId) {
    if (!isConfigured() || !linkId) return null;
    const matches = [];
    const until = new Date();
    const from = new Date(until.getTime() - 90 * 24 * 60 * 60 * 1000);
    try {
        for (let page = 1; page <= 10; page++) {
            const params = new URLSearchParams({
                from_date: from.toISOString(),
                until_date: until.toISOString(),
                page: String(page),
                page_size: '200'
            });
            const response = await fetch(`${WOMPI_API}/transactions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${PRIVATE_KEY}` }
            });
            if (!response.ok) break;
            const data = await response.json();
            const transactions = data.data || [];
            for (const txn of transactions) {
                const ref = String(txn.reference || '');
                if (txn.payment_link_id === linkId
                    || ref === linkId
                    || ref.startsWith(`${linkId}_`)) {
                    matches.push(txn);
                }
            }
            const meta = data.meta || {};
            const total = parseInt(meta.total_results, 10) || 0;
            const pages = Math.max(1, Math.ceil(total / 200));
            if (page >= pages || transactions.length === 0) break;
        }
    } catch (err) {
        logger.error('Error consultando transacciones por link Wompi:', { message: err.message, linkId });
        return null;
    }
    if (matches.length === 0) return null;
    return matches
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
}

// ============================================================================
// Producto 'Pagos a terceros' (Payouts) - https://api.payouts.wompi.co/v1
// ============================================================================

function payoutsConfigured() {
    return !!PAYOUTS_API_KEY && !!PAYOUTS_USER_PRINCIPAL_ID;
}

function payoutsHeaders(extra = {}) {
    return {
        'x-api-key': PAYOUTS_API_KEY,
        'user-principal-id': PAYOUTS_USER_PRINCIPAL_ID,
        'Content-Type': 'application/json',
        ...extra
    };
}

// Lista de bancos destino disponibles para dispersar. El campo `id` (UUID) de
// cada banco es el bankId que exige POST /payouts.
async function getPayoutBanks() {
    if (!payoutsConfigured()) return [];
    try {
        const response = await fetch(`${PAYOUTS_API}/banks`, { headers: payoutsHeaders() });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.data) ? data.data : [];
    } catch (err) {
        logger.error('Error consultando bancos de Pagos a Terceros:', { message: err.message });
        return [];
    }
}

// Cuentas origen (Wompi Cuenta y cuentas bancarias vinculadas). El campo `id`
// es el accountId que exige POST /payouts y `balanceInCents` el saldo.
async function getPayoutAccounts() {
    if (!payoutsConfigured()) return [];
    try {
        const response = await fetch(`${PAYOUTS_API}/accounts`, { headers: payoutsHeaders() });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.data) ? data.data : [];
    } catch (err) {
        logger.error('Error consultando cuentas de Pagos a Terceros:', { message: err.message });
        return [];
    }
}

// Resuelve la cuenta origen de la dispersión: prioriza WOMPI_PAYOUTS_ACCOUNT_ID
// y, si no está, elige la primera cuenta activa devuelta por GET /accounts.
async function resolveAccountId() {
    if (PAYOUTS_ACCOUNT_ID) return PAYOUTS_ACCOUNT_ID;
    const accounts = await getPayoutAccounts();
    if (accounts.length === 0) return null;
    const active = accounts.find((a) => (a.status || '').toUpperCase() === 'ACTIVE');
    return (active || accounts[0]).id || null;
}

// Normaliza identificadores de banco para comparar sin depender de acentos,
// guiones bajos o espacios (p. ej. 'av_villas', 'Banco de Bogotá', 'CAJA_SOCIAL').
function normalizeBank(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// Convierte el identificador de banco que guarda la app (p. ej. 'nequi',
// 'bancolombia' o el código de banco) en el bankId (UUID) del API de Payouts.
async function resolveBankId(bankIdentifier) {
    if (!bankIdentifier) return null;
    const normalized = normalizeBank(bankIdentifier);
    const banks = await getPayoutBanks();
    if (banks.length === 0) return null;

    const match = banks.find((b) => {
        const name = normalizeBank(b.name);
        const code = normalizeBank(b.code);
        return name === normalized || code === normalized
            || name.includes(normalized) || code.includes(normalized);
    });
    if (!match) {
        logger.warn('Banco no encontrado en Pagos a Terceros:', { bankIdentifier, disponibles: banks.map((b) => b.name).slice(0, 20) });
        return null;
    }
    return match.id || null;
}

// Normaliza la referencia de una dispersión: Wompi exige máximo 40 caracteres.
// Se conserva el inicio de la referencia, que contiene el id del pago.
function buildPayoutReference(externalRef) {
    const base = externalRef && String(externalRef).trim() ? String(externalRef) : `PAYOUT-${Date.now()}`;
    return base.length <= 40 ? base : base.slice(0, 40);
}

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Dispersa un pago a un beneficiario usando el producto Pagos a Terceros.
// Endpoint: POST /payouts (lote de pagos). El monto va en centavos.
async function createTransfer({ amount, description, bankCode, accountNumber, accountType, holderName, holderDocType, holderDocNumber, holderEmail, externalRef }) {
    if (!payoutsConfigured()) {
        logger.warn('Llaves de Pagos a Terceros no configuradas, transferencia simulada:', { amount, bankCode });
        return { simulated: true, amount, message: 'Transferencia simulada (falta WOMPI_PAYOUTS_API_KEY / WOMPI_PAYOUTS_USER_PRINCIPAL_ID)' };
    }

    try {
        const accountId = await resolveAccountId();
        const bankId = await resolveBankId(bankCode);

        if (!accountId) {
            logger.error('No se pudo resolver la cuenta origen (accountId). Revisa WOMPI_PAYOUTS_ACCOUNT_ID o GET /accounts.');
            return null;
        }
        if (!bankId) {
            logger.error('No se pudo resolver el banco destino (bankId):', { bankCode });
            return null;
        }

        const reference = buildPayoutReference(externalRef);
        const idempotencyKey = `${reference}-${Date.now()}`.slice(0, 64);

        const payoutTransaction = {
            legalIdType: holderDocType || 'CC',
            legalId: holderDocNumber,
            bankId,
            accountType: accountType === 'CHECKING' || accountType === 'CORRIENTE' ? 'CORRIENTE' : 'AHORROS',
            accountNumber,
            name: holderName,
            amount: Math.round(amount * 100),
            reference
        };
        // Wompi rechaza email vacío. Solo se envía cuando el beneficiario tiene
        // un email válido (el propietario registró uno en la plataforma).
        if (isValidEmail(holderEmail)) {
            payoutTransaction.email = holderEmail;
        }

        const body = {
            reference,
            accountId,
            paymentType: 'PROVIDERS',
            transactions: [payoutTransaction]
        };

        const response = await fetch(`${PAYOUTS_API}/payouts`, {
            method: 'POST',
            headers: payoutsHeaders({ 'idempotency-key': idempotencyKey }),
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            logger.error('Error en dispersión Pagos a Terceros:', { status: response.status, error: result });
            return null;
        }

        const payoutId = result.data?.id || result.data?.payoutId || result.id;
        const transaction = (result.data?.transactions || [])[0] || {};

        logger.info('Dispersión Pagos a Terceros creada:', { id: payoutId, transactionId: transaction.id, amount, bankCode });
        return {
            id: payoutId,
            status: result.data?.status,
            transactionId: transaction.id || null,
            amount
        };
    } catch (err) {
        logger.error('Error creando dispersión Pagos a Terceros:', { message: err.message });
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

// Reembolsa (total o parcial) una transacción aprobada de Wompi.
// amountInCents es opcional; si se omite, se reembolsa el total.
async function refundPayment(transactionId, amountInCents) {
    if (!isConfigured() || !transactionId) {
        logger.warn('Wompi no configurado o sin transaccion, reembolso simulado:', { transactionId, amountInCents });
        return { simulated: true, transactionId, amountInCents, message: 'Reembolso simulado' };
    }

    try {
        const body = {};
        if (amountInCents != null && !isNaN(Number(amountInCents))) {
            body.amount_in_cents = Math.round(Number(amountInCents));
        }

        const response = await fetch(`${WOMPI_API}/transactions/${encodeURIComponent(transactionId)}/refund`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok) {
            logger.error('Error en reembolso Wompi:', { status: response.status, transactionId, error: result });
            return null;
        }

        logger.info('Reembolso Wompi creado:', { id: result.data?.id, transactionId, amountInCents });
        return { id: result.data?.id, status: result.data?.status, transactionId };
    } catch (err) {
        logger.error('Error creando reembolso Wompi:', { message: err.message, transactionId });
        return null;
    }
}

module.exports = {
    configure, isConfigured, isSandboxMode, createPreference, getTransaction,
    getTransactionsByLink,
    createTransfer, getBankList, payoutsConfigured,
    getPayoutBanks, getPayoutAccounts, resolveAccountId, resolveBankId,
    refundPayment
};