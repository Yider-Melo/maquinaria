// Middleware de autenticacion y autorizacion.
// Valida tokens JWT, verifica roles de usuario y extrae informacion
// del token para ponerla disponible en req.user.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rentamaq-secret-key-dev';

// Valida que la solicitud incluya un token JWT valido en el header Authorization.
// Si es valido, decodifica el token y lo asigna a req.user.
function validateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Token requerido' }
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' }
        });
    }
}

// Verifica que el usuario autenticado tenga al menos uno de los roles especificados.
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.tipo_usuario)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'No tienes permisos para esta acción' }
            });
        }
        next();
    };
}

// Extrae opcionalmente la informacion del usuario desde el token JWT
// sin rechazar la solicitud si no hay token o es invalido.
function extractUser(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (_) { }
    }
    next();
}

module.exports = { validateToken, requireRole, extractUser };
