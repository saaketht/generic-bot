const winston = require('winston');
const { format } = require('winston');

// Custom format to redact sensitive information
const redactSensitiveInfo = format((info) => {
  const sensitiveFields = ['token', 'password', 'api_key', 'Authorization'];
  sensitiveFields.forEach(field => {
    if (info[field]) info[field] = '[REDACTED]';
  });
  if (info.message && typeof info.message === 'string') {
    // Redact potential API keys or tokens from the message
    info.message = info.message.replace(/([A-Za-z0-9-_]{30,})/g, '[REDACTED]');
  }
  return info;
});

// Custom format for concise error logging
const conciseErrorFormat = format.printf(({ level, message, timestamp, stack }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (stack) {
    // Only include the first line of the stack trace
    log += `\n${stack.split('\n')[0]}`;
  }
  return log;
});

// Updated custom format for console output
const consoleFormat = format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    redactSensitiveInfo(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    conciseErrorFormat
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
    )
  }));
}

module.exports = logger;