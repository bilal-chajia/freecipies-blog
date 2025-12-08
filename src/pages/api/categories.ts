import type { APIRoute } from 'astro';
import {
  getCategories, createCategory, type Env
} from '../../lib/db';
import {
  formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../lib/error-handler';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }
    const db = env.DB;

    const categories = await getCategories(db);

    // Disable caching for admin panel to always get fresh data
    const { body, status, headers } = formatSuccessResponse(categories, {
      cacheControl: 'no-cache, no-store, must-revalidate'
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching categories:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(
          ErrorCodes.DATABASE_ERROR,
          'Failed to fetch categories',
          500,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        )
    );
    return new Response(body, { status, headers });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const category = await createCategory(env.DB, body);

    return new Response(JSON.stringify(category), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to create category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
