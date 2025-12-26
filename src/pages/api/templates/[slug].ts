import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { AppError, ErrorCodes, formatErrorResponse } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { handleGetTemplate, handleUpdateTemplate, handleDeleteTemplate } from '@modules/templates';

export const prerender = false;

// GET /api/templates/[slug] - Get single template by slug
export const GET: APIRoute = async ({ params, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { slug } = params;
        return handleGetTemplate(env.DB, slug || '');
    } catch (error: any) {
        console.error('Error fetching template:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to fetch template', 500)
        );
        return new Response(body, { status, headers });
    }
};

// PUT /api/templates/[slug] - Update template
export const PUT: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { slug } = params;
        const body = await request.json();
        return handleUpdateTemplate(env.DB, slug || '', body);
    } catch (error: any) {
        console.error('Error updating template:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to update template', 500)
        );
        return new Response(body, { status, headers });
    }
};

// DELETE /api/templates/[slug] - Delete template
export const DELETE: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { slug } = params;
        return handleDeleteTemplate(env.DB, slug || '');
    } catch (error: any) {
        console.error('Error deleting template:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to delete template', 500)
        );
        return new Response(body, { status, headers });
    }
};
