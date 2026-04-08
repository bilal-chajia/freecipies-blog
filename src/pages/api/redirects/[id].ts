import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getRedirectById, updateRedirect, deleteRedirect, transformRedirectRequest, transformRedirectResponse } from '@modules/redirects';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

/**
 * GET /api/redirects/[id]
 */
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || (import.meta as any).env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const { id } = params;
    if (!id || isNaN(Number(id))) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400);
    }

    const redirect = await getRedirectById(env.DB, Number(id));
    if (!redirect) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Redirect not found', 404);
    }

    const { body, status, headers } = formatSuccessResponse(transformRedirectResponse(redirect));
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch redirect', 500)
    );
    return new Response(body, { status, headers });
  }
};

/**
 * PUT /api/redirects/[id]
 */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || (import.meta as any).env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const { id } = params;
    if (!id || isNaN(Number(id))) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400);
    }

    const body = await request.json();
    const transformedBody = transformRedirectRequest(body);
    
    const updated = await updateRedirect(env.DB, Number(id), transformedBody);
    if (!updated) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Redirect not found', 404);
    }

    const { body: respBody, status, headers } = formatSuccessResponse(transformRedirectResponse(updated));
    return new Response(respBody, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update redirect', 500)
    );
    return new Response(body, { status, headers });
  }
};

/**
 * DELETE /api/redirects/[id]
 */
export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const jwtSecret = env.JWT_SECRET || (import.meta as any).env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const { id } = params;
    if (!id || isNaN(Number(id))) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid ID', 400);
    }

    await deleteRedirect(env.DB, Number(id));
    
    const { body, status, headers } = formatSuccessResponse({ success: true });
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete redirect', 500)
    );
    return new Response(body, { status, headers });
  }
};
