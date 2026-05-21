import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticleBySlug } from '@modules/articles';
import { generateJsonLd } from '@modules/articles/utils/jsonld';
import { parseJsonLdArray } from '@modules/articles/utils/cached-fields';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateParams, SlugOrIdParam } from '@shared/validation';

export const prerender = false;

type JsonLdArticle = Parameters<typeof generateJsonLd>[0];

function toJsonLdArticle(article: NonNullable<Awaited<ReturnType<typeof getArticleBySlug>>>): JsonLdArticle {
    const recipeJson = article.type === 'recipe'
        ? (article.recipeJson ?? undefined)
        : undefined;
    const roundupJson = article.type === 'roundup'
        ? (article.roundupJson ?? undefined)
        : undefined;

    return {
        ...article,
        shortDescription: article.shortDescription ?? undefined,
        publishedAt: article.publishedAt ?? undefined,
        updatedAt: article.updatedAt ?? undefined,
        recipeJson,
        roundupJson,
        imagesJson: article.imagesJson ?? undefined,
        faqsJson: article.faqsJson ?? undefined,
        cachedAuthorJson: article.cachedAuthorJson ?? undefined,
        cachedCategoryJson: article.cachedCategoryJson ?? undefined,
    };
}

/**
 * GET /api/recipes/:slug
 * Public endpoint to get recipe by slug with JSON-LD
 */
export const GET: APIRoute = async ({ params, url }) => {
    try {
        const { slug } = validateParams(params, SlugOrIdParam);
        const db = env.DB;
        if (!db) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Get recipe specifically
        const article = await getArticleBySlug(db, slug, 'recipe');

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Recipe not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // Generate JSON-LD (prefer pre-generated, fallback to on-the-fly)
        const baseUrl = `${url.protocol}//${url.host}`;
        const cachedJsonLd = parseJsonLdArray(article.jsonldJson);
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
        console.error('Error fetching recipe:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch recipe',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};
