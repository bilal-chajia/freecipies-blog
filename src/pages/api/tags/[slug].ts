import type { APIRoute } from 'astro';
import { getTagBySlug, updateTag, deleteTag, transformTagRequestBody, transformTagResponse } from '@modules/tags';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

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
        const responseTag = transformTagResponse(tag);

        if (!responseTag) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Tag not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(responseTag, {
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
        const transformedBody = transformTagRequestBody(body);
        const tag = await updateTag(env.DB, slug, transformedBody);
        const responseTag = transformTagResponse(tag);

        if (!responseTag) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Tag not found', 404)
            );
            return new Response(errBody, { status, headers });
        }

        const { body: respBody, status, headers } = formatSuccessResponse(responseTag);
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
