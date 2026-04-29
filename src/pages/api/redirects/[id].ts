import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getRedirectById, updateRedirect, deleteRedirect, transformRedirectRequest, transformRedirectResponse } from '@modules/redirects';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { validateParams, validateBody } from '@shared/validation';
import { IdParam, UpdateRedirectSchema } from '@shared/validation';

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

    const { id } = validateParams(params, IdParam);

    const redirect = await getRedirectById(env.DB, id);
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

    const { id } = validateParams(params, IdParam);

    const body = await validateBody(request, UpdateRedirectSchema);
    const transformedBody = transformRedirectRequest(body);
    
    const updated = await updateRedirect(env.DB, id, transformedBody);
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

    const { id } = validateParams(params, IdParam);

    await deleteRedirect(env.DB, id);
    
    const { body, status, headers } = formatSuccessResponse({ success: true });
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete redirect', 500)
    );
    return new Response(body, { status, headers });
  }
};
