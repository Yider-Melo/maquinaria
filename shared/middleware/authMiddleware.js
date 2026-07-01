// Middleware de autenticacion y autorizacion compartido entre microservicios.
// Usa JWT para validar tokens y verificar roles de usuario.

const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');

const JWT_SECRET = process.env.JWT_SECRET || 'rentamaq-secret-key-dev';

// Valida que la request tenga un Bearer token valido.
// Si es valido, deja los datos del usuario en req.user.
function validateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Token requerido'));
    }
    try {
        req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        next();
    } catch {
        return next(new UnauthorizedError('Token inválido o expirado'));
    }
}

// Verifica que el usuario autenticado tenga uno de los roles especificados.
// Ejemplo: requireRole('admin') o requireRole('propietario', 'admin')
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.tipo_usuario)) {
            return next(new ForbiddenError('No tienes permisos para esta acción'));
        }
        next();
    };
}

// Version opcional de validateToken: si hay token lo decodifica, si no sigue sin error.
// Util para rutas publicas donde el usuario puede o no estar autenticado.
function extractUser(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        } catch (_) { }
    }
    next();
}

module.exports = { validateToken, requireRole, extractUser };
