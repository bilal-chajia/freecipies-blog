import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { AppError, ErrorCodes, formatErrorResponse } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { handleListTemplates, handleCreateTemplate } from '@modules/templates';

export const prerender = false;

// GET /api/templates - List all templates
export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const url = new URL(request.url);
        const isActive = url.searchParams.get('is_active') !== 'false';

        return handleListTemplates(env.DB, isActive);
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to fetch templates', 500)
        );
        return new Response(body, { status, headers });
    }
};

// POST /api/templates - Create new template
export const POST: APIRoute = async ({ request, locals }) => {
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

        const body = await request.json();
        return handleCreateTemplate(env.DB, body);
    } catch (error: any) {
        console.error('Error creating template:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to create template', 500)
        );
        return new Response(body, { status, headers });
    }
};
