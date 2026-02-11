import winston from "winston";
import path from "path";
import { config } from "./config";

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.dirname(config.LOG_FILE);

// Configure transports
const transports: winston.transport[] = [];

// Always add console transport
transports.push(
  new winston.transports.Console({
    format: config.NODE_ENV === "production" ? logFormat : consoleFormat,
    level: config.LOG_LEVEL,
  })
);

// Add file transport in production or when LOG_FILE is specified
if (config.NODE_ENV === "production" || config.LOG_FILE) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: config.LOG_FILE,
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: "code-merge-tool-api" },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle exceptions and rejections
if (config.NODE_ENV === "production") {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
      format: logFormat,
    })
  );

  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
      format: logFormat,
    })
  );
}

// Create a stream object for Morgan HTTP request logger
export const loggerStream = {
  write: (message: string) => {
    // Remove trailing newline
    logger.info(message.trim());
  },
};

export default logger;
