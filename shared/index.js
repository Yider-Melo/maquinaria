// Punto de entrada unico de la libreria compartida.
// Exporta todos los modulos reutilizables para que cada microservicio
// los importe con una sola linea: require('../../../../shared')

const {
    AppError, NotFoundError, ValidationError,
    UnauthorizedError, ForbiddenError, ConflictError
} = require('./errors/AppError');
const { errorHandler } = require('./errors/errorHandler');
const { success, paginated } = require('./utils/response');
const { validate, validateQuery } = require('./utils/validate');
const { validateToken, requireRole, extractUser } = require('./middleware/authMiddleware');
const { schemas } = require('./validators/schemas');
const eventBus = require('./events/eventBus');
const EVENT_TYPES = require('./events/eventTypes');

module.exports = {
    AppError, NotFoundError, ValidationError,
    UnauthorizedError, ForbiddenError, ConflictError,
    errorHandler,
    success, paginated,
    validate, validateQuery,
    validateToken, requireRole, extractUser,
    schemas,
    eventBus,
    EVENT_TYPES
};
