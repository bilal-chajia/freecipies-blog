import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getRedirects, createRedirect, transformRedirectRequest, transformRedirectResponse } from '@modules/redirects';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { validateBody } from '@shared/validation';
import { CreateRedirectSchema } from '@shared/validation';

export const prerender = false;

/**
 * GET /api/redirects
 * List all redirects (Admin only)
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || (import.meta as any).env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const isActiveStr = searchParams.get('isActive');
    const isActive = isActiveStr === 'true' ? true : isActiveStr === 'false' ? false : undefined;

    const redirects = await getRedirects(env.DB, { search, isActive });
    const responseData = redirects.map(transformRedirectResponse);

    const { body, status, headers } = formatSuccessResponse(responseData);
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching redirects:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch redirects', 500)
    );
    return new Response(body, { status, headers });
  }
};

/**
 * POST /api/redirects
 * Create a new redirect (Admin only)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || (import.meta as any).env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const body = await validateBody(request, CreateRedirectSchema);
    const transformedBody = transformRedirectRequest(body);
    
    const newRedirect = await createRedirect(env.DB, transformedBody);
    const responseData = transformRedirectResponse(newRedirect);

    const { body: respBody, status, headers } = formatSuccessResponse(responseData);
    return new Response(respBody, { status: 201, headers });
  } catch (error) {
    console.error('Error creating redirect:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create redirect', 500)
    );
    return new Response(body, { status, headers });
  }
};
