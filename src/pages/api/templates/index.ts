import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { AppError, ErrorCodes, formatErrorResponse, formatSuccessResponse } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getTemplates, createTemplate } from '@modules/templates';
import { validateBody, CreateTemplateSchema } from '@shared/validation';

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
    } catch (error: unknown) {
        console.error('Error fetching templates:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch templates';
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, message, 500)
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

        const data = await validateBody(request, CreateTemplateSchema);
        const result = await createTemplate(env.DB, data);
        
        const { body, status, headers } = formatSuccessResponse(result);
        return new Response(body, { status: 201, headers });
    } catch (error: unknown) {
        console.error('Error creating template:', error);
        const err = error as { message?: string };
        
        // Handle SQLite Unique constraint error on slug
        if (err.message?.includes('UNIQUE constraint')) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Template with this slug already exists', 409)
            );
            return new Response(body, { status, headers });
        }
        
        const message = error instanceof Error ? error.message : 'Failed to create template';
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, message, 500)
        );
        return new Response(body, { status, headers });
    }
};
