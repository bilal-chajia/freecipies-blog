import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticleBySlug } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { generateJsonLd } from '@modules/articles/utils/jsonld';
import { parseJsonLdArray } from '@modules/articles/utils/cached-fields';
import { validateParams, SlugOrIdParam } from '@shared/validation';

export const prerender = false;

type JsonLdArticle = Parameters<typeof generateJsonLd>[0];

function toJsonLdArticle(article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>): JsonLdArticle {
    const recipe_json = article.type === 'recipe'
        ? (article.recipe_json ?? undefined)
        : undefined;
    const roundup_json = article.type === 'roundup'
        ? (article.roundup_json ?? undefined)
        : undefined;

    return {
        ...article,
        short_description: article.short_description ?? undefined,
        published_at: article.published_at ?? undefined,
        updated_at: article.updated_at ?? undefined,
        recipe_json,
        roundup_json,
        images_json: article.images_json ?? undefined,
        faqs_json: article.faqs_json ?? undefined,
        cached_author_json: article.cached_author_json ?? undefined,
        cached_category_json: article.cached_category_json ?? undefined,
    };
}

/**
 * GET /api/roundups/:slug
 * Public endpoint to get roundup by slug with JSON-LD ItemList
 */
export const GET: APIRoute = async ({ params, url }) => {
    try {
        const { slug } = validateParams(params, SlugOrIdParam);
        const db = env.DB;
        if (!db) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Get roundup specifically
        const article = await getArticleBySlug(db, slug, 'roundup', { workflow_status: 'published' });

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Roundup not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // Use pre-generated JSON-LD with fallback to runtime generation
        const baseUrl = `${url.protocol}//${url.host}`;
        const cachedJsonLd = parseJsonLdArray(article.jsonld_json);
        const jsonLd = cachedJsonLd.length > 0
            ? cachedJsonLd
            : generateJsonLd(toJsonLdArticle(article), baseUrl);

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
