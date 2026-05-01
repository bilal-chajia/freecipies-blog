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
import {
  validateBody,
  validateQuery,
  PinListQuery,
  PinDeleteQuery,
  CreatePinSchema,
  UpdatePinSchema,
} from '@shared/validation';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const { article_id } = validateQuery(new URL(request.url).searchParams, PinListQuery);

    const pins = await getPinterestPins(env.DB, { articleId: article_id });

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

    const body = await validateBody(request, CreatePinSchema);

    const inserted = await createPinterestPin(env.DB, {
      articleId: body.article_id,
      boardId: body.board_id ?? null,
      title: body.title,
      description: body.description,
      imageUrl: body.image_url,
      destinationUrl: body.pin_url || '',
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

    const body = await validateBody(request, UpdatePinSchema);

    await updatePinterestPin(env.DB, body.id, {
      boardId: body.board_id ?? null,
      title: body.title,
      description: body.description,
      imageUrl: body.image_url,
      destinationUrl: body.pin_url || ''
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

    const { id } = validateQuery(new URL(request.url).searchParams, PinDeleteQuery);

    await deletePinterestPin(env.DB, id);

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
