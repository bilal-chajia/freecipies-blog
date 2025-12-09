import type { APIRoute } from 'astro';
import {
  getAuthors, createAuthor, type Env
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

    const authors = await getAuthors(db);

    const { body, status, headers } = formatSuccessResponse(authors, {
      cacheControl: 'no-cache, no-store, must-revalidate'
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching authors:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Failed to fetch authors',
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

    const reqBody = await request.json();
    const author = await createAuthor(env.DB, reqBody);

    const { body, status, headers } = formatSuccessResponse(author);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error('Error creating author:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create author', 500)
    );
    return new Response(body, { status, headers });
  }
};
