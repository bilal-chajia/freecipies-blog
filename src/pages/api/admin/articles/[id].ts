import { z } from 'zod';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
    getArticleById,
    updateArticleById,
    deleteArticleById,
    setWorkflowStatusById,
    toggleFavoriteById,
    setArticleTagsById,
    syncCachedFields,
    checkPublishTransition
} from '@modules/articles';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateParams, validateBody, validateQuery, IdParam, UpdateArticleSchema, ArticleActionQuery } from '@shared/validation';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { transformArticleRequestBody } from '../../../../modules/articles/api/helpers';

export const prerender = false;

/**
 * GET /api/admin/articles/:id
 * Get article by ID (admin use)
 */
export const GET: APIRoute = async ({ params, locals }) => {
    const { id } = validateParams(params, IdParam);

    try {
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
    const { id } = validateParams(params, IdParam);
    const url = new URL(request.url);

    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const updateData = await validateBody(request, UpdateArticleSchema);

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const transformed = transformArticleRequestBody(updateData);

        // Completeness guard: a save that flips the article to published must
        // satisfy the publish criteria, evaluated on the resulting state
        // (existing row overlaid with this patch).
        if (updateData.workflow_status === 'published') {
            const existing = await getArticleById(env.DB, id);
            if (!existing) {
                const { body: errBody, status: errStatus, headers: errHeaders } = formatErrorResponse(
                    new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
                );
                return new Response(errBody, { status: errStatus, headers: errHeaders });
            }
            const issues = checkPublishTransition({ targetStatus: 'published', existing, patch: transformed });
            if (issues.length > 0) {
                const { body: errBody, status: errStatus, headers: errHeaders } = formatErrorResponse(
                    new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot publish: ${issues.join(' ')}`, 422)
                );
                return new Response(errBody, { status: errStatus, headers: errHeaders });
            }
        }

        const updated = await updateArticleById(env.DB, id, transformed);

        if (!updated) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
            );
            return new Response(body, { status, headers });
        }

        if (updateData.selectedTags) {
            await setArticleTagsById(env.DB, id, updateData.selectedTags);
        }

        await syncCachedFields(env.DB, id, env.SITE_URL);

        const { body, status, headers } = formatSuccessResponse(updated);
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
    const { id } = validateParams(params, IdParam);

    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const deleted = await deleteArticleById(env.DB, id);

        if (!deleted) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found or already deleted', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ id, success: true });
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
 * Handle toggle and status operations (set-workflow-status, toggle-favorite)
 * Query param: action=set-workflow-status | toggle-favorite
 */
export const PATCH: APIRoute = async ({ request, params, locals }) => {
    const { id } = validateParams(params, IdParam);
    const url = new URL(request.url);
    const { action } = validateQuery(url.searchParams, ArticleActionQuery);

    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        let result: { workflow_status?: string; is_favorite?: boolean } | null = null;

        if (action === 'set-workflow-status') {
            const body = await request.json().catch(() => ({}));
            const parseResult = z.object({
                status: z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived'])
            }).safeParse(body);

            if (!parseResult.success) {
                const { body: errBody, status: errStatus, headers: errHeaders } = formatErrorResponse(
                    new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid workflow status', 400)
                );
                return new Response(errBody, { status: errStatus, headers: errHeaders });
            }

            const { status: newStatus } = parseResult.data;

            // Completeness guard: only fully-formed content may go live.
            if (newStatus === 'published') {
                const existing = await getArticleById(env.DB, id);
                if (!existing) {
                    const { body: errBody, status: errStatus, headers: errHeaders } = formatErrorResponse(
                        new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
                    );
                    return new Response(errBody, { status: errStatus, headers: errHeaders });
                }
                const issues = checkPublishTransition({ targetStatus: newStatus, existing });
                if (issues.length > 0) {
                    const { body: errBody, status: errStatus, headers: errHeaders } = formatErrorResponse(
                        new AppError(ErrorCodes.VALIDATION_ERROR, `Cannot publish: ${issues.join(' ')}`, 422)
                    );
                    return new Response(errBody, { status: errStatus, headers: errHeaders });
                }
            }

            result = await setWorkflowStatusById(env.DB, id, newStatus);
        } else if (action === 'toggle-favorite') {
            result = await toggleFavoriteById(env.DB, id);
        }

        if (!result) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Article not found', 404)
            );
            return new Response(body, { status, headers });
        }

        // If workflow status is set to published, also sync cached fields
        if (action === 'set-workflow-status' && result && result.workflow_status === 'published') {
            await syncCachedFields(env.DB, id, env.SITE_URL);
        }

        const { body, status, headers } = formatSuccessResponse({ id, ...result });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error modifying article status:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to modify article status', 500)
        );
        return new Response(body, { status, headers });
    }
};
