/**
 * Centralized error handling for API endpoints
 * Provides consistent error responses and logging
 */

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export class AppError extends Error implements ApiError {
  code: string;
  statusCode: number;
  details?: Record<string, any>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
} as const;

/**
 * Format error response for API endpoints
 */
export function formatErrorResponse(error: unknown): {
  body: string;
  status: number;
  headers: Record<string, string>;
} {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(
      ErrorCodes.INTERNAL_ERROR,
      error.message,
      500
    );
  } else {
    appError = new AppError(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500
    );
  }

  // Log error for debugging
  console.error(`[${appError.code}] ${appError.message}`, appError.details);

  return {
    body: JSON.stringify({
      success: false,
      error: appError.message,
      code: appError.code,
      ...(appError.details && { details: appError.details }),
    }),
    status: appError.statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Format success response for API endpoints
 */
export function formatSuccessResponse<T>(
  data: T,
  options?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    cacheControl?: string;
  }
): {
  body: string;
  status: number;
  headers: Record<string, string>;
} {
  const response: any = {
    success: true,
    data,
  };

  if (options?.pagination) {
    response.pagination = options.pagination;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.cacheControl) {
    headers['Cache-Control'] = options.cacheControl;
  }

  return {
    body: JSON.stringify(response),
    status: 200,
    headers,
  };
}

