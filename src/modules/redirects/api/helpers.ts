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

  if (body.status_code !== undefined) {
    transformed.status_code = parseInt(body.status_code, 10);
  }

  if (body.is_active !== undefined) {
    transformed.is_active = body.is_active === true || body.is_active === 'true' || body.is_active === 1;
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
    is_active: Boolean(redirect.is_active),
    hit_count: Number(redirect.hit_count),
    status_code: Number(redirect.status_code),
  };
}
