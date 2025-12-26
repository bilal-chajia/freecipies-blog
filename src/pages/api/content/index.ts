import type { APIRoute } from 'astro';
import { getArticles } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

/**
 * GET /api/content
 * Unified content listing with filters
 * 
 * Query Parameters:
 * - type: 'article' | 'recipe' | 'roundup' (optional, filters by type)
 * - category: string (category slug)
 * - author: string (author slug)
 * - search: string (search in headline/description)
 * - page: number (default: 1)
 * - limit: number (default: 12, max: 100)
 * - online: 'true' | 'false' (filter by published status)
 */
export const GET: APIRoute = async ({ request, locals }) => {
    const url = new URL(request.url);

    // Parse query parameters
    const type = url.searchParams.get('type') as 'article' | 'recipe' | 'roundup' | null;
    const category = url.searchParams.get('category');
    const author = url.searchParams.get('author');
    const search = url.searchParams.get('search');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '12')));
    const onlineParam = url.searchParams.get('online');
    const offset = (page - 1) * limit;

    try {
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        // Build query options
        const options: any = {
            limit,
            offset,
        };

        // Type filter
        if (type && ['article', 'recipe', 'roundup'].includes(type)) {
            options.type = type;
        }

        // Category filter
        if (category) {
            options.categorySlug = category;
        }

        // Author filter
        if (author) {
            options.authorSlug = author;
        }

        // Search filter
        if (search && search.trim()) {
            options.search = search.trim();
        }

        // Online status filter (default to true for public API)
        if (onlineParam === 'false') {
            options.isOnline = false;
        } else if (onlineParam === 'true' || !onlineParam) {
            options.isOnline = true;
        }

        const result = await getArticles(db, options);

        // Transform items for card display (use cached fields if available)
        const items = result.items.map(article => {
            // Parse cached card JSON if available
            let cachedCard = null;
            if (article.cachedCardJson) {
                try {
                    cachedCard = typeof article.cachedCardJson === 'string'
                        ? JSON.parse(article.cachedCardJson)
                        : article.cachedCardJson;
                } catch {
                    cachedCard = null;
                }
            }

            // Parse images for thumbnail
            let thumbnail = null;
            if (article.imagesJson) {
                try {
                    const images = typeof article.imagesJson === 'string'
                        ? JSON.parse(article.imagesJson)
                        : article.imagesJson;
                    thumbnail = images.thumbnail || images.cover;
                } catch {
                    thumbnail = null;
                }
            }

            // Return minimal card data
            return {
                id: article.id,
                type: article.type,
                slug: article.slug,
                headline: article.headline,
                shortDescription: article.shortDescription,
                thumbnail,
                categoryLabel: (article as any).categoryLabel,
                categorySlug: (article as any).categorySlug,
                categoryColor: (article as any).categoryColor,
                authorName: (article as any).authorName,
                authorSlug: (article as any).authorSlug,
                publishedAt: article.publishedAt,
                isOnline: article.isOnline,
                // Type-specific fields from cache
                ...(cachedCard || {}),
            };
        });

        const { body, status, headers } = formatSuccessResponse({
            items,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
                hasMore: page * limit < result.total,
            },
            filters: {
                type: type || 'all',
                category: category || null,
                author: author || null,
                search: search || null,
            },
        }, {
            cacheControl: 'public, max-age=60', // Short cache for listings
        });

        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching content:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch content',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};
