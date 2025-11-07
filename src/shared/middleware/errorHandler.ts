import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/validation.js';
import { errorResponse } from '../utils/response.js';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  console.error('Error:', error);

  // Validation errors
  if (error instanceof ValidationError) {
    return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', error.errors);
  }

  // MongoDB duplicate key error
  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    const field = Object.keys((error as any).keyPattern || {})[0];
    return errorResponse(
      res,
      `${field} already exists`,
      409,
      'DUPLICATE_KEY',
      { field }
    );
  }

  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return errorResponse(res, 'Invalid ID format', 400, 'INVALID_ID');
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Default server error
  const statusCode = (error as any).statusCode || 500;
  const message = error.message || 'Internal server error';

  return errorResponse(
    res,
    message,
    statusCode,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): Response {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
}

export default { errorHandler, notFoundHandler };

