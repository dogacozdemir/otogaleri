import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { loggerService } from "../services/loggerService";

/**
 * Custom Error class with error ID
 */
export class AppError extends Error {
  public errorId: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.errorId = uuidv4();
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Error Handler Middleware
 * 
 * Production-safe error handling:
 * - Never expose SQL errors or stack traces to users
 * - Generate unique error IDs for tracking
 * - Log all errors with full details
 * - Return generic messages to users
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate error ID if not present
  const errorId = err instanceof AppError ? err.errorId : uuidv4();
  const isProduction = process.env.NODE_ENV === "production";
  
  // Determine status code
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  } else if ((err as any).statusCode) {
    statusCode = (err as any).statusCode;
  } else if ((err as any).status) {
    statusCode = (err as any).status;
  }

  // Log error with full details
  const errorDetails = {
    errorId,
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    timestamp: new Date().toISOString(),
  };

  // Check if it's a database/SQL error
  const isDatabaseError = 
    err.message.includes("SQL") ||
    err.message.includes("database") ||
    err.message.includes("connection") ||
    err.message.includes("ER_") ||
    err.message.includes("ECONNREFUSED") ||
    (err as any).code?.startsWith("ER_") ||
    (err as any).code === "ECONNREFUSED";

  // Check if it's a validation error (Zod, etc.)
  const isValidationError = 
    err.message.includes("validation") ||
    err.message.includes("Validation") ||
    (err as any).issues; // Zod error format

  // Log error based on severity
  if (statusCode >= 500) {
    loggerService.error(`[ErrorHandler] ${errorId}`, errorDetails);
  } else if (statusCode >= 400) {
    loggerService.warn(`[ErrorHandler] ${errorId}`, errorDetails);
  } else {
    loggerService.info(`[ErrorHandler] ${errorId}`, errorDetails);
  }

  // Log database errors separately for monitoring
  if (isDatabaseError) {
    loggerService.error(`[ErrorHandler] Database Error ${errorId}`, {
      ...errorDetails,
      type: "database_error",
    });
  }

  // Prepare response based on environment
  if (isProduction) {
    // Production: Generic error messages - NEVER expose stack traces or internal details
    if (isDatabaseError) {
      res.status(statusCode).json({
        error: "Database operation failed",
        errorId,
        message: "Please contact technical support with the error reference number",
        supportMessage: `Error Reference: ${errorId}`,
      });
    } else if (isValidationError) {
      // Validation errors are safe to show (already sanitized by Zod)
      // But limit details to prevent information leakage
      const validationDetails = (err as any).issues 
        ? (err as any).issues.map((issue: any) => ({
            path: issue.path?.join('.') || 'unknown',
            message: issue.message,
          }))
        : undefined;
      
      res.status(statusCode).json({
        error: "Validation failed",
        errorId,
        message: "Please check your input and try again",
        ...(validationDetails ? { details: validationDetails } : {}),
      });
    } else if (statusCode >= 500) {
      // Server errors: Generic message - NO stack trace, NO internal details
      res.status(statusCode).json({
        error: "Internal server error",
        errorId,
        message: "An unexpected error occurred. Please contact technical support.",
        supportMessage: `Error Reference: ${errorId}`,
      });
    } else {
      // Client errors (400-499): Show sanitized message but NO internal details
      // Sanitize error message to prevent information leakage
      const sanitizedMessage = err.message 
        ? err.message.replace(/at\s+.*/g, '').replace(/Error:\s*/g, '').substring(0, 200)
        : "Request failed";
      
      res.status(statusCode).json({
        error: sanitizedMessage,
        errorId,
      });
    }
  } else {
    // Development: Detailed error messages (only in development)
    res.status(statusCode).json({
      error: err.message,
      errorId,
      stack: err.stack,
      details: errorDetails,
    });
  }
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(`Route ${req.method} ${req.path} not found`, 404);
  next(error);
}

