import type { APIRoute } from 'astro';
import {
  formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../lib/error-handler';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';
import type { Env } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    const env = (locals as any).runtime?.env as Env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    if (slug) {
      // Get single board
      const board = await env.DB.prepare(`
        SELECT * FROM pinterest_boards WHERE slug = ?
      `).bind(slug).first();

      if (!board) {
        const { body, status, headers } = formatErrorResponse(
          new AppError(ErrorCodes.NOT_FOUND, 'Board not found', 404)
        );
        return new Response(body, { status, headers });
      }

      const { body, status, headers } = formatSuccessResponse({ board });
      return new Response(body, { status, headers });
    }

    // Get all boards
    const { results } = await env.DB.prepare(`
      SELECT * FROM pinterest_boards 
      WHERE is_active = 1 
      ORDER BY name ASC
    `).all();

    const { body, status, headers } = formatSuccessResponse({ boards: results });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching boards:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch boards', 500)
    );
    return new Response(body, { status, headers });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

    // Authenticate user
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const body = await request.json();
    const { slug, name, description, board_url } = body;

    if (!slug || !name) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: slug, name', 400)
      );
      return new Response(errBody, { status, headers });
    }

    const result = await env.DB.prepare(`
      INSERT INTO pinterest_boards (slug, name, description, board_url)
      VALUES (?, ?, ?, ?)
    `).bind(slug, name, description || '', board_url || '').run();

    const { body: respBody, status, headers } = formatSuccessResponse({
      id: result.meta.last_row_id
    });
    return new Response(respBody, { status: 201, headers });
  } catch (error) {
    console.error('Error creating board:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create board', 500)
    );
    return new Response(body, { status, headers });
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

    // Authenticate user
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const body = await request.json();
    const { id, slug, name, description, board_url, is_active } = body;

    if (!id) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Board ID is required', 400)
      );
      return new Response(errBody, { status, headers });
    }

    await env.DB.prepare(`
      UPDATE pinterest_boards 
      SET slug = ?, name = ?, description = ?, board_url = ?, is_active = ?
      WHERE id = ?
    `).bind(slug, name, description, board_url, is_active ? 1 : 0, id).run();

    const { body: respBody, status, headers } = formatSuccessResponse({ updated: true });
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error('Error updating board:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update board', 500)
    );
    return new Response(body, { status, headers });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;
    const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

    // Authenticate user
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions', 403);
    }

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Board ID is required', 400)
      );
      return new Response(errBody, { status, headers });
    }

    await env.DB.prepare(`DELETE FROM pinterest_boards WHERE id = ?`).bind(id).run();

    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error deleting board:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete board', 500)
    );
    return new Response(body, { status, headers });
  }
};
