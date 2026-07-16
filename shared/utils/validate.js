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
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        const sanitized = Array.isArray(obj) ? [] : {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeStrings(obj[key]);
        }
        return sanitized;
    }
    return obj;
}

function formatJoiError(error) {
    const messages = error.details.slice(0, 3).map(d => {
        const field = d.path.join('.') || 'campo';
        const message = d.message || '';
        const type = d.type || '';

        if (type === 'string.email') return 'El email no tiene un formato válido';
        if (type === 'any.required') return `El ${field} es requerido`;
        if (type === 'string.empty') return `El ${field} no puede estar vacío`;
        if (type === 'string.guid') return `El ${field} no tiene un formato UUID válido`;

        if (/must be a valid email$/.test(message)) return 'El email no tiene un formato válido';
        if (/is required$/.test(message)) return `El ${field} es requerido`;
        if (/not allowed to be empty$/.test(message) || /cannot be empty$/.test(message)) return `El ${field} no puede estar vacío`;

        return message;
    });

    return messages.join('. ');
}

function validate(schema, source = 'body') {
    return (req, res, next) => {
        const data = req[source];
        const { error, value } = schema.validate(data, { stripUnknown: true, convert: true });
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
