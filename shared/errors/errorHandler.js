// Middleware global de manejo de errores para Express.
// Si el error es un AppError conocido, devuelve el codigo y mensaje especifico.
// Si es un error inesperado, responde con 500 generico y lo logea.

const { AppError } = require('./AppError');

function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message
            }
        });
    }

    console.error('Error no manejado:', err);

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        }
    });
}

module.exports = { errorHandler };
