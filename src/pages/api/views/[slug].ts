import type { APIRoute } from 'astro';
import { incrementViewCount, getArticleBySlug, type Env } from '../../../lib/db';
import {
  formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../../lib/error-handler';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { slug } = params;

  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
    );
    return new Response(body, { status, headers });
  }

  try {
    const env = (locals as any).runtime?.env as Env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const article = await getArticleBySlug(env.DB, slug);
    const { body, status, headers } = formatSuccessResponse({
      viewCount: article?.viewCount || 0
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching view count:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch view count', 500)
    );
    return new Response(body, { status, headers });
  }
};

export const POST: APIRoute = async ({ params, locals }) => {
  const { slug } = params;

  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
    );
    return new Response(body, { status, headers });
  }

  try {
    const env = (locals as any).runtime?.env as Env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const success = await incrementViewCount(env.DB, slug);

    if (success) {
      const { body, status, headers } = formatSuccessResponse({ incremented: true });
      return new Response(body, { status, headers });
    } else {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
      );
      return new Response(body, { status, headers });
    }
  } catch (error) {
    console.error('Error incrementing view count:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to increment view count', 500)
    );
    return new Response(body, { status, headers });
  }
};
