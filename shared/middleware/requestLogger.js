function requestLogger(req, res, next) {
    const logger = req.app?.locals?.logger;
    if (!logger) return next();

    const start = Date.now();
    const { method, originalUrl } = req;
    const correlationId = req.correlationId;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';

        logger.log(level, `${method} ${originalUrl} - ${res.statusCode}`, {
            method,
            url: originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            correlationId,
            userId: req.user?.id
        });
    });

    next();
}

module.exports = { requestLogger };