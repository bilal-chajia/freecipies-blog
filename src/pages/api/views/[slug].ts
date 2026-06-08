import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticleBySlug, incrementViewCount } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateParams, SlugOrIdParam } from '@shared/validation';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const { slug } = validateParams(params, SlugOrIdParam);

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const article = await getArticleBySlug(env.DB, slug);
    const { body, status, headers } = formatSuccessResponse({
      view_count: article?.view_count || 0
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

export const POST: APIRoute = async ({ params }) => {
  try {
    const { slug } = validateParams(params, SlugOrIdParam);

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
