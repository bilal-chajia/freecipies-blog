import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { AppError, ErrorCodes, formatErrorResponse, formatSuccessResponse } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getTemplates, createTemplate } from '@modules/templates';

export const prerender = false;

// GET /api/templates - List all templates
export const GET: APIRoute = async ({ request, locals }) => {
    try {
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const url = new URL(request.url);
        const isActive = url.searchParams.get('is_active') !== 'false';

        const templates = await getTemplates(env.DB, { activeOnly: isActive });
        
        const { body, status, headers } = formatSuccessResponse(templates);
        return new Response(body, { status, headers });
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
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const data = await request.json();
        const result = await createTemplate(env.DB, data);
        
        const { body, status, headers } = formatSuccessResponse(result);
        return new Response(body, { status: 201, headers });
    } catch (error: any) {
        console.error('Error creating template:', error);
        
        // Handle SQLite Unique constraint error on slug
        if (error.message?.includes('UNIQUE constraint')) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Template with this slug already exists', 409)
            );
            return new Response(body, { status, headers });
        }
        
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, error.message || 'Failed to create template', 500)
        );
        return new Response(body, { status, headers });
    }
};
