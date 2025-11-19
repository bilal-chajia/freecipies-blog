import type { APIRoute } from 'astro';
import {
  getTags, createTag, type Env
} from '../../lib/db';
import {
  formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../lib/error-handler';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }
    const db = env.DB;

    const tags = await getTags(db);

    const { body, status, headers } = formatSuccessResponse(tags, {
      cacheControl: 'public, max-age=3600'
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching tags:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Failed to fetch tags',
          500,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
    );
    return new Response(body, { status, headers });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const tag = await createTag(env.DB, body);

    return new Response(JSON.stringify(tag), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return new Response(JSON.stringify({ error: 'Failed to create tag' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
