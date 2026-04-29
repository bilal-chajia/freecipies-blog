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
import {
  validateBody,
  validateQuery,
  BoardGetQuery,
  BoardDeleteQuery,
  CreatePinterestBoardSchema,
  UpdatePinterestBoardSchema,
} from '@shared/validation';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const { slug } = validateQuery(new URL(request.url).searchParams, BoardGetQuery);

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

    const body = await validateBody(request, CreatePinterestBoardSchema);

    const inserted = await createPinterestBoard(env.DB, {
      slug: body.slug,
      name: body.name,
      description: body.description || '',
      board_url: body.board_url || '',
      cover_image_url: body.cover_image_url || '',
      is_active: body.is_active
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

    const body = await validateBody(request, UpdatePinterestBoardSchema);

    await updatePinterestBoard(env.DB, body.id, {
      slug: body.slug, name: body.name, description: body.description, board_url: body.board_url, is_active: body.is_active, cover_image_url: body.cover_image_url
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

    const { id } = validateQuery(new URL(request.url).searchParams, BoardDeleteQuery);

    await deletePinterestBoard(env.DB, id);

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
