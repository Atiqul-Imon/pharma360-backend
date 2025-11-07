import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

/**
 * Send success response
 */
export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };

  return res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response {
  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse<T[]> = {
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };

  return res.status(200).json(response);
}

/**
 * Send error response
 */
export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  errorCode?: string,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode || 'ERROR',
      message,
      details,
    },
  };

  return res.status(statusCode).json(response);
}

/**
 * Send created response
 */
export function createdResponse<T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response {
  return successResponse(res, data, message, 201);
}

/**
 * Send no content response
 */
export function noContentResponse(res: Response): Response {
  return res.status(204).send();
}

export default {
  successResponse,
  paginatedResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
};

