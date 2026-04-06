import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import {
  getPinterestBoards,
  getPinterestBoard,
  createPinterestBoard,
  updatePinterestBoard,
  deletePinterestBoard
} from '@modules/pinterest';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    if (slug) {
      // Get single board
      const board = await getPinterestBoard(env.DB, slug);

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
    const allBoards = await getPinterestBoards(env.DB);
    const sortedBoards = [...allBoards].sort((a, b) => a.name.localeCompare(b.name));

    const { body, status, headers } = formatSuccessResponse(sortedBoards);
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
    const { slug, name, description, board_url, is_active, cover_image_url } = body;

    if (!slug || !name) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: slug, name', 400)
      );
      return new Response(errBody, { status, headers });
    }

    const inserted = await createPinterestBoard(env.DB, {
      slug,
      name,
      description: description || '',
      board_url: board_url || '',
      cover_image_url: cover_image_url || '',
      is_active
    });

    const { body: respBody, status, headers } = formatSuccessResponse({
      id: inserted?.id
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
    const { id, slug, name, description, board_url, is_active, cover_image_url } = body;

    if (!id) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Board ID is required', 400)
      );
      return new Response(errBody, { status, headers });
    }

    await updatePinterestBoard(env.DB, typeof id === 'string' ? parseInt(id, 10) : id, {
      slug, name, description, board_url, is_active, cover_image_url
    });

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

    await deletePinterestBoard(env.DB, parseInt(id, 10));

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
