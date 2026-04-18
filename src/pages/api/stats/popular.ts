import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { getPopularArticles } from '@modules/articles';
import { resolveVariantUrl } from '@shared/types/images';

export const prerender = false;

// GET /api/stats/popular - Get popular articles by view count
export const GET: APIRoute = async ({ request, locals }) => {
    try {

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

        const result = await getPopularArticles(env.DB, limit);

        const articles = (result || []).map((a: any) => {
            // Extract cover image URL from images_json
            let imageUrl = '';
            try {
                const images = a.images_json ? JSON.parse(a.images_json) : {};
                imageUrl = resolveVariantUrl(images?.cover?.variants?.md || images?.cover?.variants?.sm) || '';
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
    } catch (error: any) {
        console.error('Error fetching popular articles:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to fetch popular articles', 500)
        );
        return new Response(body, { status, headers });
    }
};
