const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('shared');

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
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Token inválido o expirado' }
        });
    }
}

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

function extractUser(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const secret = getJwtSecret();
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, secret);
        } catch (_) { }
    }
    next();
}

module.exports = { validateToken, requireRole, extractUser };
