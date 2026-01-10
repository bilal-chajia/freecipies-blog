import type { APIRoute } from 'astro';
import {
    getArticleById,
    updateArticleById,
    deleteArticleById,
    toggleOnlineById,
    toggleFavoriteById,
    setArticleTagsById,
    syncCachedFields
} from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { transformArticleRequestBody } from '../../../../modules/articles/api/helpers';

export const prerender = false;

/**
 * Helper to parse and validate numeric ID from URL params
 */
function parseArticleId(idParam: string | undefined): number | null {
    if (!idParam) return null;
    const id = parseInt(idParam, 10);
    if (isNaN(id) || id <= 0) return null;
    return id;
}

/**
 * GET /api/admin/articles/:id
 * Get article by ID (admin use)
 */
export const GET: APIRoute = async ({ params, locals }) => {
    const id = parseArticleId(params.id);

    if (!id) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid numeric ID is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const article = await getArticleById(env.DB, id);

        if (!article) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(article);
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching article by ID:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch article', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PUT /api/admin/articles/:id
 * Update article by ID (requires Editor role)
 */
export const PUT: APIRoute = async ({ request, params, locals }) => {
    const id = parseArticleId(params.id);

    if (!id) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid numeric ID is required', 400)
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

        const requestBody = await request.json();
        const { selectedTags, ...rest } = requestBody ?? {};

        // Standardized normalization using helper
        const transformedData = transformArticleRequestBody(rest);

        const success = await updateArticleById(env.DB, id, transformedData);

        if (!success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // Tags (articles_to_tags + cached_tags_json)
        if (selectedTags !== undefined) {
            const tagIds = Array.isArray(selectedTags)
                ? selectedTags
                    .map((value: unknown) => Number(value))
                    .filter((value: number) => Number.isFinite(value) && value > 0)
                : [];
            await setArticleTagsById(env.DB, id, tagIds);
        }

        // Automatically synchronize cached fields (zero-join optimization)
        await syncCachedFields(env.DB, id);

        // Fetch updated article to return
        const updatedArticle = await getArticleById(env.DB, id);

        const { body, status, headers } = formatSuccessResponse(updatedArticle);
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error updating article:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update article', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * DELETE /api/admin/articles/:id
 * Soft delete article by ID (requires Editor role)
 */
export const DELETE: APIRoute = async ({ request, params, locals }) => {
    const id = parseArticleId(params.id);

    if (!id) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid numeric ID is required', 400)
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

        // Get article to find its category before deletion
        // const article = await getArticleById(env.DB, id);
        // const categoryId = (article as any)?.categoryId;

        const success = await deleteArticleById(env.DB, id);

        if (!success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found or already deleted', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ deleted: true, id });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting article:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete article', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PATCH /api/admin/articles/:id
 * Handle toggle operations (toggle-online, toggle-favorite)
 * Query param: action=toggle-online | toggle-favorite
 */
export const PATCH: APIRoute = async ({ request, params, locals }) => {
    const id = parseArticleId(params.id);
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (!id) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid numeric ID is required', 400)
        );
        return new Response(body, { status, headers });
    }

    if (!action || !['toggle-online', 'toggle-favorite'].includes(action)) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Valid action query param required: toggle-online or toggle-favorite', 400)
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

        let result: { isOnline?: boolean; isFavorite?: boolean } | null = null;

        if (action === 'toggle-online') {
            result = await toggleOnlineById(env.DB, id);
        } else if (action === 'toggle-favorite') {
            result = await toggleFavoriteById(env.DB, id);
        }

        if (!result) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // If toggled online, also sync cached fields to be safe (though not strictly required for just online toggle)
        if (action === 'toggle-online') {
            await syncCachedFields(env.DB, id);
        }

        const { body, status, headers } = formatSuccessResponse({ id, ...result });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error toggling article status:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to toggle article status', 500)
        );
        return new Response(body, { status, headers });
    }
};
