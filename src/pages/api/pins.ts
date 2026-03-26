import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import type { Env } from '@shared/types';
import { 
  getPinterestPins, 
  createPinterestPin, 
  updatePinterestPin, 
  deletePinterestPin 
} from '@modules/pinterest';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get('article_id');

    if (!articleId) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'article_id is required', 400)
      );
      return new Response(body, { status, headers });
    }

    const pins = await getPinterestPins(env.DB, { articleId: parseInt(articleId, 10) });

    const { body, status, headers } = formatSuccessResponse({ pins });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching pins:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch pins', 500)
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
    // Frontend still sends legacy fields like image_alt, image_width, is_primary, etc.
    const { 
      article_id, board_id, title, description, image_url, pin_url
    } = body;

    if (!article_id || !title || !description || !image_url) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: article_id, title, description, image_url', 400)
      );
      return new Response(errBody, { status, headers });
    }

    const inserted = await createPinterestPin(env.DB, {
      articleId: article_id,
      boardId: board_id || null,
      title,
      description,
      imageUrl: image_url,
      destinationUrl: pin_url || '',
      status: 'draft',
      tagsJson: '[]'
    });

    const { body: respBody, status, headers } = formatSuccessResponse({
      id: inserted?.id
    });
    return new Response(respBody, { status: 201, headers });
  } catch (error) {
    console.error('Error creating pin:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create pin', 500)
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
    const { 
      id, board_id, title, description, image_url, pin_url 
    } = body;

    if (!id) {
      const { body: errBody, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Pin ID is required', 400)
      );
      return new Response(errBody, { status, headers });
    }

    await updatePinterestPin(env.DB, id, {
      boardId: board_id || null,
      title,
      description,
      imageUrl: image_url,
      destinationUrl: pin_url || ''
    });

    const { body: respBody, status, headers } = formatSuccessResponse({ updated: true });
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error('Error updating pin:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update pin', 500)
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
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Pin ID is required', 400)
      );
      return new Response(errBody, { status, headers });
    }

    await deletePinterestPin(env.DB, parseInt(id, 10));

    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error deleting pin:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete pin', 500)
    );
    return new Response(body, { status, headers });
  }
};
