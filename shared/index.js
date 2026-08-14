// Punto de entrada unico de la libreria compartida.
// Exporta todos los modulos reutilizables para que cada microservicio
// los importe con una sola linea: require('../../../../shared')

const {
    AppError, NotFoundError, ValidationError,
    UnauthorizedError, ForbiddenError, ConflictError
} = require('./errors/AppError');
const { errorHandler } = require('./errors/errorHandler');
const { success, paginated } = require('./utils/response');
const { validate, validateQuery, validateParams, uuidParam } = require('./utils/validate');
const { validateToken, requireRole, extractUser, getJwtSecret, getInternalApiKey } = require('./middleware/authMiddleware');
const { correlationId } = require('./middleware/correlationId');
const { requestLogger } = require('./middleware/requestLogger');
const { schemas } = require('./validators/schemas');
const eventBus = require('./events/eventBus');
const EVENT_TYPES = require('./events/eventTypes');
const { buildPool } = require('./config/db');
const emailService = require('./emailService');

module.exports = {
    AppError, NotFoundError, ValidationError,
    UnauthorizedError, ForbiddenError, ConflictError,
    errorHandler,
    success, paginated,
    validate, validateQuery, validateParams, uuidParam,
    validateToken, requireRole, extractUser, getJwtSecret, getInternalApiKey,
    correlationId,
    requestLogger,
    schemas,
    eventBus,
    EVENT_TYPES,
    buildPool,
    setEventBusLogger: eventBus.setLogger,
    emailService
};
