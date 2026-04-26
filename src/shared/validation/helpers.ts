/**
 * Zod Validation Helpers
 * ======================
 * Bridge between Zod schemas and the existing AppError system.
 * Provides validate(), validateBody(), validateParams(), validateQuery().
 */
import { z, ZodError, ZodSchema } from 'zod';
import { AppError, ErrorCodes } from '../utils/error-handler';

/**
 * Format ZodError issues into a user-friendly { field: message } map.
 */
function formatZodIssues(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    details[path] = issue.message;
  }
  return details;
}

/**
 * Validate data against a Zod schema.
 * Returns typed data on success, throws AppError(VALIDATION_ERROR) on failure.
 *
 * @example
 * const { name, slug } = validate(CreateCategorySchema, body);
 */
export function validate<T extends ZodSchema>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      result.error.issues[0]?.message || 'Validation failed',
      400,
      { fields: formatZodIssues(result.error) },
    );
  }
  return result.data;
}

/**
 * Validate request body (JSON) against a Zod schema.
 * Combines JSON parsing + validation in one step.
 *
 * @example
 * const body = await validateBody(request, CreateCategorySchema);
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400);
  }
  return validate(schema, data);
}

/**
 * Validate URL path params (string values) against a Zod schema.
 * Use z.coerce.number() to convert string params to numbers.
 *
 * @example
 * const { id } = validateParams(params, IdParam);
 */
export function validateParams<T extends ZodSchema>(
  params: Record<string, string | undefined>,
  schema: T,
): z.infer<T> {
  return validate(schema, params);
}

/**
 * Validate URL query params against a Zod schema.
 * Accepts URLSearchParams or a plain Record.
 *
 * @example
 * const { page, limit, offset } = validateQuery(url.searchParams, PaginationQuery);
 */
export function validateQuery<T extends ZodSchema>(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  schema: T,
): z.infer<T> {
  const raw: Record<string, string | undefined> = {};
  if (searchParams instanceof URLSearchParams) {
    for (const [key, value] of searchParams) {
      raw[key] = value;
    }
  } else {
    Object.assign(raw, searchParams);
  }
  return validate(schema, raw);
}

// Re-export z for convenience
export { z };
