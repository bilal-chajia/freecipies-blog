import type { APIRoute } from 'astro';
import type { Env } from '../../../lib/db';
import {
    formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../../lib/error-handler';

export const prerender = false;

// GET /api/stats/popular - Get popular articles by view count
export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

        // Get articles ordered by view_count (fallback to recent if view_count not available)
        const result = await db.prepare(`
      SELECT 
        r.id,
        r.slug,
        r.label,
        r.type,
        r.image,
        r.view_count,
        c.label as category_label,
        c.slug as category_slug
      FROM recipies r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.is_online = 1
      ORDER BY r.view_count DESC, r.created_at DESC
      LIMIT ?1
    `).bind(limit).all();

        const articles = (result.results || []).map((a: any) => ({
            id: a.id,
            slug: a.slug,
            title: a.label,
            type: a.type,
            image: a.image,
            views: a.view_count || 0,
            category: a.category_label,
            categorySlug: a.category_slug,
        }));

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
