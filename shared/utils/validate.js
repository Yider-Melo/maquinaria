// Middleware factory para validar el body de una request con Joi.
// Si la validacion falla, lanza ValidationError con el mensaje de Joi.
// Si pasa, reemplaza req.body con el objeto sanitizado (sin campos extra).

const { ValidationError } = require('../errors/AppError');

function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { stripUnknown: true });
        if (error) {
            return next(new ValidationError(error.details[0].message));
        }
        req.body = value;
        next();
    };
}

module.exports = { validate };
