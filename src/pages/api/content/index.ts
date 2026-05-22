import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticles } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateQuery, z } from '@shared/validation';
import { parseCachedCard, cleanCardImages } from '@modules/articles/utils/cached-fields';

export const prerender = false;

/** GET /api/content query schema */
const ContentListQuery = z.object({
    type: z.enum(['article', 'recipe', 'roundup']).optional(),
    category: z.string().optional(),
    author: z.string().optional(),
    search: z.string().optional(),
    workflowStatus: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived', 'all']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
}).transform(({ page, limit, type, category, author, search, workflowStatus }) => ({
    page,
    limit,
    offset: (page - 1) * limit,
    type,
    category,
    author,
    search,
    workflowStatus,
}));

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

    // Validate all query parameters
    const { page, limit, offset, type, category, author, search, workflowStatus: workflowStatusParam } = validateQuery(url.searchParams, ContentListQuery);

    try {
        const db = env.DB;
        if (!db) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Build query options
        const options: Record<string, unknown> = {
            limit,
            offset,
        };

        // Type filter (already validated by Zod)
        if (type) {
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

        // Workflow status filter (default to 'published' for public API)
        if (workflowStatusParam && workflowStatusParam !== 'all') {
            options.workflowStatus = workflowStatusParam;
        } else if (!workflowStatusParam) {
            options.workflowStatus = 'published';
        }

        const result = await getArticles(db, options);

        // Transform items for card display (use cached fields if available)
        const items = result.items.map(article => {
            const articleData = article as any;
            
            // Parse and clean cached card JSON if available
            const cachedCard = cleanCardImages(parseCachedCard(article.cachedCardJson));

            // Parse images for thumbnail
            let thumbnail = null;
            if (article.imagesJson) {
                try {
                    const images = typeof article.imagesJson === 'string'
                        ? JSON.parse(article.imagesJson)
                        : article.imagesJson;
                    const rawThumbnail = images.thumbnail || images.hero;
                    if (rawThumbnail) {
                        const cleanedObj = cleanCardImages({ image: rawThumbnail });
                        thumbnail = cleanedObj.image;
                    }
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
                categoryLabel: articleData.categoryLabel,
                categorySlug: articleData.categorySlug,
                categoryColor: articleData.categoryColor,
                authorName: articleData.authorName,
                authorSlug: articleData.authorSlug,
                publishedAt: article.publishedAt,
                workflowStatus: article.workflowStatus,
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
