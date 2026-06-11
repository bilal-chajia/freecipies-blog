import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticles } from '@modules/articles';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateQuery, PaginationQuery } from '@shared/validation';

export const prerender = false;

/**
 * GET /api/roundups
 * List roundups with filters and pagination
 * 
 * Query Parameters:
 * - category: string (category slug)
 * - author: string (author slug)
 * - search: string (search in headline/description)
 * - page: number (default: 1)
 * - limit: number (default: 12, max: 100)
 */
export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);

    // Validate pagination query params
    const { page, limit, offset } = validateQuery(url.searchParams, PaginationQuery);

    // Parse filter query parameters
    const category = url.searchParams.get('category');
    const author = url.searchParams.get('author');
    const search = url.searchParams.get('search');

    try {
        const db = env.DB;
        if (!db) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Build query options - always filter by type='roundup'
        const options: Record<string, unknown> = {
            type: 'roundup',
            workflow_status: 'published',
            limit,
            offset,
        };

        if (category) options.categorySlug = category;
        if (author) options.authorSlug = author;
        if (search?.trim()) options.search = search.trim();

        const result = await getArticles(db, options);

        // Transform for roundup cards
        const items = result.items.map(article => {
            const articleData = article as any;
            // Parse roundup JSON for item count
            let itemCount = 0;
            if (articleData.roundup_json) {
                try {
                    const roundupData = typeof articleData.roundup_json === 'string'
                        ? JSON.parse(articleData.roundup_json as string)
                        : articleData.roundup_json;
                    itemCount = (roundupData as { items?: unknown[] }).items?.length || 0;
                } catch {
                    itemCount = 0;
                }
            }

            // Parse images for thumbnail
            let thumbnail = null;
            if (article.images_json) {
                try {
                    const images = typeof article.images_json === 'string'
                        ? JSON.parse(article.images_json)
                        : article.images_json;
                    thumbnail = images.thumbnail || images.hero;
                } catch {
                    thumbnail = null;
                }
            }

            return {
                id: article.id,
                slug: article.slug,
                headline: article.headline,
                short_description: article.short_description,
                thumbnail,
                categoryLabel: articleData.categoryLabel,
                categorySlug: articleData.categorySlug,
                categoryColor: articleData.categoryColor,
                authorName: articleData.authorName,
                authorSlug: articleData.authorSlug,
                published_at: article.published_at,
                // Roundup-specific
                itemCount,
            };
        });

        const { body, status, headers } = formatSuccessResponse({
            items,
            pagination: {
                page,
                limit,
                total: result.total,
                total_pages: Math.ceil(result.total / limit),
                has_more: page * limit < result.total,
            },
        }, {
            cacheControl: 'public, max-age=300',
        });

        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching roundups:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch roundups',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};
