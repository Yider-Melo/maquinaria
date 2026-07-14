const Joi = require('joi');
const { ValidationError } = require('../errors/AppError');

function uuidParam(name) {
    return Joi.object({
        [name]: Joi.string().guid({ version: 'uuidv4' }).required().messages({
            'string.guid': `El parámetro ${name} no tiene un formato UUID válido`,
            'any.required': `El parámetro ${name} es requerido`
        })
    });
}

function sanitizeStrings(obj) {
    if (typeof obj === 'string') {
        return obj.replace(/<[^>]*>/g, '').trim();
    }
    if (obj && typeof obj === 'object') {
        const sanitized = Array.isArray(obj) ? [] : {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeStrings(obj[key]);
        }
        return sanitized;
    }
    return obj;
}

function formatJoiError(error) {
    const detail = error.details[0];
    const field = detail.path.join('.');
    return `${field}: ${detail.message}`;
}

function validate(schema, source = 'body') {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = schema.validate(data, { stripUnknown: true, convert: source === 'query' });
        if (error) {
            return next(new ValidationError(formatJoiError(error)));
        }
        req[source] = sanitizeStrings(value);
        next();
    };
}

function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, { stripUnknown: true });
        if (error) {
            return next(new ValidationError(formatJoiError(error)));
        }
        req.params = value;
        next();
    };
}

module.exports = { validate, validateParams, validateQuery: (s) => validate(s, 'query'), uuidParam };
