import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticleBySlug } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { generateJsonLd } from '@modules/articles/utils/jsonld';
import { validateParams, SlugOrIdParam } from '@shared/validation';

export const prerender = false;

/**
 * GET /api/roundups/:slug
 * Public endpoint to get roundup by slug with JSON-LD ItemList
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
    try {
        const { slug } = validateParams(params, SlugOrIdParam);
        const db = env.DB;
        if (!db) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Get roundup specifically
        const article = await getArticleBySlug(db, slug, 'roundup');

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Roundup not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // Use pre-generated JSON-LD with fallback to runtime generation
        const baseUrl = `${url.protocol}//${url.host}`;
        const jsonLd = article.jsonldJson
            ? (typeof article.jsonldJson === 'string' ? JSON.parse(article.jsonldJson) : article.jsonldJson)
            : generateJsonLd(article, baseUrl);

        // Include JSON-LD in response
        const responseData = {
            ...article,
            jsonLd,
        };

        const { body, status, headers } = formatSuccessResponse(responseData, {
            cacheControl: 'public, max-age=3600',
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching roundup:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch roundup',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};
