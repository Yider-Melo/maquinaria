const createServiceLogger = require('shared/logger');

const logger = createServiceLogger('api-gateway');

const httpLogger = (req, res, next) => {
  const start = Date.now();
  const correlationId = req.correlationId;

  logger.info(`${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get('user-agent'),
    correlationId
  });

  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;

    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
        correlationId,
        error: data?.error?.message
      });
    } else {
      logger.debug(`${req.method} ${req.originalUrl} - ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        correlationId
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = httpLogger;
