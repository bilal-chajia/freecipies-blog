/**
 * Redirects Module - API Helpers
 * ==============================
 * Helper functions for API endpoints.
 */

import type { Redirect } from '../schema/redirects.schema';

/**
 * Transform redirect request body (handle type conversions)
 */
export function transformRedirectRequest(body: any): any {
  const transformed = { ...body };

  if (body.statusCode !== undefined) {
    transformed.statusCode = parseInt(body.statusCode, 10);
  }

  if (body.isActive !== undefined) {
    transformed.isActive = body.isActive === true || body.isActive === 'true' || body.isActive === 1;
  }

  return transformed;
}

/**
 * Transform redirect response
 */
export function transformRedirectResponse(redirect: Redirect): any {
  if (!redirect) return redirect;
  
  return {
    ...redirect,
    // Ensure accurate types for frontend
    isActive: Boolean(redirect.isActive),
    hitCount: Number(redirect.hitCount),
    statusCode: Number(redirect.statusCode),
  };
}
