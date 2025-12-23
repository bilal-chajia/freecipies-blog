import type { APIRoute } from 'astro';
import { updateTag, deleteTag } from '@modules/tags';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

// We don't have getTagBySlug exported yet, but we can query it or add it.
// For now let's assume we can just query it directly or add it to db.ts if needed.
// Actually I didn't add getTagBySlug in db.ts, I should have.
// But I can use a simple query here or update db.ts.
// Let's update db.ts first? No, I can just query it here for now to save time, 
// or better, I'll just implement it here using raw query if needed, but db.ts is better.
// Wait, I did implement getTags which returns all tags.
// I can just filter from there or add a specific function.
// Let's add a helper here for now.

const getTagBySlug = async (db: any, slug: string) => {
    const { results } = await db.prepare('SELECT * FROM tags WHERE slug = ?').bind(slug).all();
    if (results.length === 0) return null;
    return {
        id: results[0].id,
        slug: results[0].slug,
        label: results[0].label,
        // ... map other fields if needed, but for now let's just return the raw object or map it properly
        // actually I should use the mapper from db.ts but it's not exported.
        // I'll just return the result and hope the frontend handles it or I'll duplicate the mapper logic slightly.
        // The frontend expects specific fields.
        // Let's just use the same structure as getTags.
        ...results[0],
        isOnline: Boolean(results[0].is_online),
        isFavorite: Boolean(results[0].is_favorite),
        createdAt: results[0].created_at,
        updatedAt: results[0].updated_at,
        route: `/tags/${results[0].slug}`
    };
};

export const GET: APIRoute = async ({ request, params, locals }) => {
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

        const tag = await getTagBySlug(db, slug);

        if (!tag) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Tag not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(tag, {
            cacheControl: 'public, max-age=3600'
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching tag:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch tag',
                    500,
                    { originalError: error instanceof Error ? error.message : 'Unknown error' }
                )
        );
        return new Response(body, { status, headers });
    }
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
    const { slug } = params;

    if (!slug) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json();
        const tag = await updateTag(env.DB, slug, body);

        if (!tag) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Tag not found', 404)
            );
            return new Response(errBody, { status, headers });
        }

        const { body: respBody, status, headers } = formatSuccessResponse(tag);
        return new Response(respBody, { status, headers });
    } catch (error) {
        console.error('Error updating tag:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update tag', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
    const { slug } = params;

    if (!slug) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const success = await deleteTag(env.DB, slug);

        if (!success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Tag not found or failed to delete', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ deleted: true });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting tag:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete tag', 500)
        );
        return new Response(body, { status, headers });
    }
};
