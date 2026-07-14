const winston = require('winston');
const path = require('path');
const fs = require('fs');

const createServiceLogger = (serviceName) => {
  const logsDir = path.join(__dirname, '../../../logs', serviceName);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5
      })
    ]
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, service, ...metadata }) => {
            let meta = '';
            if (Object.keys(metadata).length > 0) {
              meta = JSON.stringify(metadata, null, 2);
            }
            return `${timestamp} [${service}] ${level}: ${message} ${meta}`;
          }
        )
      )
    }));
  }

  return logger;
};

module.exports = createServiceLogger;
