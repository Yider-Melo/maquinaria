const rateLimit = require('express-rate-limit');

const userLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 100,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' }
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { userLimiter, authLimiter };
