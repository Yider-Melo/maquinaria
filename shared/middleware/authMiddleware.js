const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.warn('⚠️ JWT_SECRET no configurado. Usando secreto por defecto (inseguro). Configura JWT_SECRET en producción.');
        return 'rentamaq-secret-key-dev';
    }
    return secret;
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

module.exports = { validateToken, requireRole, extractUser, getJwtSecret };
