import type { APIRoute } from 'astro';

/**
 * Standard error response builder
 */
export function errorResponse(
  message: string,
  code: string,
  status: number = 500,
  details?: Record<string, any>
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      code,
      details: details || {}
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Standard success response builder
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  cacheControl: string = 'public, max-age=3600'
) {
  return new Response(
    JSON.stringify({
      success: true,
      data
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl
      }
    }
  );
}

/**
 * Standard paginated response builder
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  status: number = 200
) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  url: URL,
  required: string[] = [],
  optional: string[] = []
): { valid: boolean; params: Record<string, string | null>; error?: string } {
  const params: Record<string, string | null> = {};

  // Check required parameters
  for (const param of required) {
    const value = url.searchParams.get(param);
    if (!value) {
      return {
        valid: false,
        params,
        error: `Missing required parameter: ${param}`
      };
    }
    params[param] = value;
  }

  // Collect optional parameters
  for (const param of optional) {
    params[param] = url.searchParams.get(param);
  }

  return { valid: true, params };
}

/**
 * Safe JSON parsing with error handling
 */
export async function safeJsonParse<T>(request: Request): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await request.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}
