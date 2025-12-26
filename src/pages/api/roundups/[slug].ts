import type { APIRoute } from 'astro';
import { getArticleBySlug } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import type { RoundupJson } from '@modules/articles/types/roundups.types';

export const prerender = false;

/**
 * Generate Schema.org ItemList JSON-LD for roundups
 */
function generateItemListJsonLd(article: any, baseUrl: string): object {
    const roundupData: RoundupJson = typeof article.roundupJson === 'string'
        ? JSON.parse(article.roundupJson || '{"items":[],"listType":"ItemList"}')
        : article.roundupJson || { items: [], listType: 'ItemList' };

    const imagesData = typeof article.imagesJson === 'string'
        ? JSON.parse(article.imagesJson || '{}')
        : article.imagesJson || {};

    // Get main image
    const mainImage = imagesData.cover?.variants?.lg?.url ||
        imagesData.cover?.variants?.md?.url;

    // Build ItemList elements
    const itemListElement = (roundupData.items || []).map(item => {
        // Get item image
        const itemImage = item.cover?.variants?.lg?.url ||
            item.cover?.variants?.md?.url;

        // Determine URL
        let itemUrl: string | undefined;
        if (item.article_id) {
            itemUrl = `${baseUrl}/recipes/${item.article_id}`;
        } else if (item.external_url) {
            itemUrl = item.external_url;
        }

        return {
            '@type': 'ListItem',
            position: item.position,
            name: item.title,
            description: item.subtitle,
            url: itemUrl,
            image: itemImage,
        };
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: article.headline,
        description: article.shortDescription,
        image: mainImage,
        numberOfItems: roundupData.items?.length || 0,
        itemListElement,
        author: {
            '@type': 'Person',
            name: article.authorName || article.cachedAuthorJson?.name,
        },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
    };
}

/**
 * GET /api/roundups/:slug
 * Public endpoint to get roundup by slug with JSON-LD ItemList
 */
export const GET: APIRoute = async ({ params, locals, url }) => {
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
        const db = env.DB;

        // Get roundup specifically
        const article = await getArticleBySlug(db, slug, 'roundup');

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Roundup not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // Generate JSON-LD ItemList
        const baseUrl = `${url.protocol}//${url.host}`;
        const jsonLd = generateItemListJsonLd(article, baseUrl);

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
