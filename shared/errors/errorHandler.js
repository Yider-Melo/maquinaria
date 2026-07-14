const { AppError } = require('./AppError');

function errorHandler(err, req, res, _next) {
    const logger = req.app?.locals?.logger;
    const meta = {
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        correlationId: req.correlationId
    };

    if (err instanceof AppError) {
        const message = process.env.NODE_ENV === 'production' && err.statusCode === 500
            ? 'Error interno del servidor'
            : err.message;

        if (logger) {
            logger.error(`${err.code}: ${err.message}`, {
                ...meta,
                code: err.code,
                statusCode: err.statusCode,
                stack: err.stack
            });
        }

        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message
            }
        });
    }

    if (logger) {
        logger.error('Error no manejado:', {
            ...meta,
            message: err.message,
            stack: err.stack
        });
    }

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'Error interno del servidor'
                : err.message
        }
    });
}

module.exports = { errorHandler };
