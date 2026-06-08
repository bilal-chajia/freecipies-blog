import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticleBySlug } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateParams, SlugOrIdParam } from '@shared/validation';

export const prerender = false;

/**
 * GET /api/articles/:slug
 * Public endpoint to get article by slug
 * For mutations (PUT/DELETE), use /api/articles/:id instead
 */
export const GET: APIRoute = async ({ params }) => {
    const { slug } = validateParams(params, SlugOrIdParam);

    try {
        const db = env.DB;
        if (!db) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const article = await getArticleBySlug(db, slug);

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(article, {
            cacheControl: 'public, max-age=3600'
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching article:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch article',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};