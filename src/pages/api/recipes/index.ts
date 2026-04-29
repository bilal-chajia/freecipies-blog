import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getArticles } from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateQuery, PaginationQuery } from '@shared/validation';

export const prerender = false;

/**
 * GET /api/recipes
 * List recipes with filters and pagination
 * 
 * Query Parameters:
 * - category: string (category slug)
 * - author: string (author slug)
 * - search: string (search in headline/description)
 * - page: number (default: 1)
 * - limit: number (default: 12, max: 100)
 * - difficulty: 'Easy' | 'Medium' | 'Hard'
 */
export const GET: APIRoute = async ({ request, locals }) => {
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

        // Build query options - always filter by type='recipe'
        const options: any = {
            type: 'recipe',
            isOnline: true,
            limit,
            offset,
        };

        if (category) options.categorySlug = category;
        if (author) options.authorSlug = author;
        if (search?.trim()) options.search = search.trim();

        const result = await getArticles(db, options);

        // Transform for recipe cards
        const items = result.items.map(article => {
            // Parse recipe JSON for card data
            let recipeData: any = {};
            if ((article as any).recipeJson) {
                try {
                    recipeData = typeof (article as any).recipeJson === 'string'
                        ? JSON.parse((article as any).recipeJson)
                        : (article as any).recipeJson;
                } catch {
                    recipeData = {};
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

            return {
                id: article.id,
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
                // Recipe-specific fields
                totalTime: recipeData.total,
                prepTime: recipeData.prep,
                cookTime: recipeData.cook,
                difficulty: recipeData.difficulty,
                servings: recipeData.servings,
                rating: recipeData.aggregateRating,
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
        }, {
            cacheControl: 'public, max-age=300', // 5 min cache for listings
        });

        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching recipes:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch recipes',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};
