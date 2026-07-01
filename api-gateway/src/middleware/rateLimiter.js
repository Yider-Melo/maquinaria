// Middleware de rate limiting.
// Protege la API limitando la cantidad de solicitudes por usuario/IP.
// Define limites genericos para la API y limites restrictivos para auth.
const rateLimit = require('express-rate-limit');

// Limite general: 100 solicitudes por minuto por usuario o IP
const userLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false
});

// Limite para endpoints de autenticacion: 10 intentos cada 15 minutos
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' }
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { userLimiter, authLimiter };
