import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

// Error types enum
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  INTEGRATION_ERROR = "INTEGRATION_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  FILE_ERROR = "FILE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// Custom Application Error class
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public override message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, AppError);
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let errorType = ErrorType.INTERNAL_ERROR;
  let message = "An unexpected error occurred";
  let details: unknown = undefined;

  // Handle known AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorType = error.type;
    message = error.message;
    details = error.details;
  } else {
    // Handle specific error types
    if (error.name === "ValidationError") {
      statusCode = 400;
      errorType = ErrorType.VALIDATION_ERROR;
      message = "Validation failed";
      details = error.message;
    } else if (error.name === "MongoError" || error.name === "MongooseError") {
      statusCode = 500;
      errorType = ErrorType.DATABASE_ERROR;
      message = "Database operation failed";
    } else if (error.name === "JsonWebTokenError") {
      statusCode = 401;
      errorType = ErrorType.AUTHENTICATION_ERROR;
      message = "Invalid authentication token";
    } else if (error.name === "TokenExpiredError") {
      statusCode = 401;
      errorType = ErrorType.AUTHENTICATION_ERROR;
      message = "Authentication token expired";
    }
  }

  // Log error (don't log validation errors as errors)
  const logLevel = statusCode >= 500 ? "error" : "warn";
  logger[logLevel]("Request error:", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: errorType,
      statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: errorType,
      message: message,
    },
  };

  // Include details in development mode or for client errors
  if (process.env["NODE_ENV"] === "development" || statusCode < 500) {
    errorResponse.error.details = details;
  }

  // Include stack trace only in development mode
  if (process.env["NODE_ENV"] === "development") {
    if (error.stack) {
      errorResponse.error.stack = error.stack;
    }
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    ErrorType.NOT_FOUND_ERROR,
    `Resource not found: ${req.method} ${req.path}`,
    404
  );

  next(error);
};

/**
 * Async wrapper for route handlers to catch async errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
