const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const createServiceLogger = require('../logger');
const logger = createServiceLogger('auth-middleware');

// Devuelve un secreto de entorno. En producción falla si no está configurado;
// en desarrollo usa un valor por defecto (inseguro) para poder levantar el stack.
function getSecret(envName, devFallback) {
    const value = process.env[envName];
    if (value) return value;
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`${envName} no configurado. Configúralo en producción.`);
    }
    logger.warn(`${envName} no configurado. Usando valor por defecto (INSEGURO) — SOLO para desarrollo.`);
    return devFallback;
}

function getJwtSecret() {
    return getSecret('JWT_SECRET', 'rentamaq-secret-key-dev');
}

// Clave para comunicación entre microservicios.
function getInternalApiKey() {
    return getSecret('INTERNAL_API_KEY', 'rentamaq-internal-key-dev');
}

// Valida que la request tenga un Bearer token valido.
// Si es valido, deja los datos del usuario en req.user.
function validateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Token requerido'));
    }
    try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(authHeader.split(' ')[1], secret);
        req.user = decoded;
        next();
    } catch {
        return next(new UnauthorizedError('Token inválido o expirado'));
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.tipo_usuario)) {
            return next(new ForbiddenError('No tienes permisos para esta acción'));
        }
        next();
    };
}

function extractUser(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const secret = getJwtSecret();
            req.user = jwt.verify(authHeader.split(' ')[1], secret);
        } catch (_) { }
    }
    next();
}

module.exports = { validateToken, requireRole, extractUser, getJwtSecret, getInternalApiKey };
