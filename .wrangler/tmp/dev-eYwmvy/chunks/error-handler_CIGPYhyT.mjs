globalThis.process ??= {}; globalThis.process.env ??= {};
class AppError extends Error {
  code;
  statusCode;
  details;
  constructor(code, message, statusCode = 500, details) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }
}
const ErrorCodes = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST"
};
function formatErrorResponse(error) {
  let appError;
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
      "An unexpected error occurred",
      500
    );
  }
  console.error(`[${appError.code}] ${appError.message}`, appError.details);
  return {
    body: JSON.stringify({
      success: false,
      error: appError.message,
      code: appError.code,
      ...appError.details && { details: appError.details }
    }),
    status: appError.statusCode,
    headers: {
      "Content-Type": "application/json"
    }
  };
}
function formatSuccessResponse(data, options) {
  const response = {
    success: true,
    data
  };
  if (options?.pagination) {
    response.pagination = options.pagination;
  }
  const headers = {
    "Content-Type": "application/json"
  };
  if (options?.cacheControl) {
    headers["Cache-Control"] = options.cacheControl;
  }
  return {
    body: JSON.stringify(response),
    status: 200,
    headers
  };
}
function validatePaginationParams(limitParam, pageParam) {
  const limit = Math.min(Math.max(parseInt(limitParam || "12"), 1), 100);
  const page = Math.max(parseInt(pageParam || "1"), 1);
  const offset = (page - 1) * limit;
  return {
    valid: true,
    limit,
    page,
    offset
  };
}

export { AppError as A, ErrorCodes as E, formatSuccessResponse as a, formatErrorResponse as f, validatePaginationParams as v };
