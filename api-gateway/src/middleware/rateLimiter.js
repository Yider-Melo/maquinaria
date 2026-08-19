const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// Límite general por usuario (o por IP si no está autenticado).
const userLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || (isProd ? 100 : 1000),
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }
    },
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false
});

// Límite por IP para las rutas de autenticación. Alto a propósito para que los
// usuarios legítimos detrás de una IP compartida no se bloqueen entre sí; la
// protección fina por cuenta la cubre accountLimiter.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || (isProd ? 30 : 100),
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' }
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Límite por cuenta (email) para el login. Solo cuentan los intentos FALLIDOS
// (un login exitoso no gasta cupo). Así un atacante no puede probar contraseñas
// de un mismo correo en bucle, sin afectar a usuarios de una IP compartida.
const accountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX, 10) || (isProd ? 5 : 100),
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Demasiados intentos para esta cuenta. Intenta de nuevo en 15 minutos.' }
    },
    keyGenerator: (req) => {
        const email = String(req.body?.email || '').trim().toLowerCase();
        return email ? `email:${email}` : req.ip;
    },
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { userLimiter, authLimiter, accountLimiter };
