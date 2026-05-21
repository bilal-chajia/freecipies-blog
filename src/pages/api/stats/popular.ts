import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { getPopularArticles } from '@modules/articles';
import { resolveVariantUrl } from '@shared/types/images';
import { validateQuery, z } from '@shared/validation';

export const prerender = false;

/** GET /api/stats/popular query schema */
const PopularQuery = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

// GET /api/stats/popular - Get popular articles by view count
export const GET: APIRoute = async ({ request, locals }) => {
    try {

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const url = new URL(request.url);
        const { limit } = validateQuery(url.searchParams, PopularQuery);

        const result = await getPopularArticles(env.DB, limit);

        const articles = (result || []).map((a: Record<string, unknown>) => {
                // Extract hero image URL from images_json
                let imageUrl = '';
                try {
                    const imagesJson = typeof a.images_json === 'string' ? JSON.parse(a.images_json) : (a.images_json || {});
                    const images = imagesJson as Record<string, any>;
                    imageUrl = resolveVariantUrl(images?.hero?.variants?.md || images?.hero?.variants?.sm) || '';
                } catch { }
            
            return {
                id: a.id,
                slug: a.slug,
                title: a.label,
                type: a.type,
                imageUrl,
                views: a.view_count || 0,
                category: a.category_label,
                categorySlug: a.category_slug,
            };
        });

        const { body, status, headers } = formatSuccessResponse(articles, {
            cacheControl: 'no-cache, no-store, must-revalidate'
        });
        return new Response(body, { status, headers });
    } catch (error: unknown) {
        console.error('Error fetching popular articles:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch popular articles';
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, message, 500)
        );
        return new Response(body, { status, headers });
    }
};
