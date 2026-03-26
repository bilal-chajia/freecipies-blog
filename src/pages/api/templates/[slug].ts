import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { AppError, ErrorCodes, formatErrorResponse, formatSuccessResponse } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getTemplateBySlug, updateTemplate, deleteTemplate } from '@modules/templates';

export const prerender = false;

// GET /api/templates/[slug] - Get single template by slug
export const GET: APIRoute = async ({ params, locals }) => {
    try {

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { slug } = params;
        const template = await getTemplateBySlug(env.DB, slug || '');
        
        if (!template) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Template not found', 404)
            );
            return new Response(body, { status, headers });
        }
        
        const { body, status, headers } = formatSuccessResponse(template);
        return new Response(body, { status, headers });
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

        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { slug } = params;
        const payload = await request.json();
        const updated = await updateTemplate(env.DB, slug || '', payload);
        
        if (!updated) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Template not found', 404)
            );
            return new Response(body, { status, headers });
        }
        
        const { body, status, headers } = formatSuccessResponse(updated);
        return new Response(body, { status, headers });
    } catch (error: any) {
        console.error('Error updating template:', error);
        
        if (error.message?.includes('UNIQUE constraint')) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Template with this slug already exists', 409)
            );
            return new Response(body, { status, headers });
        }
        
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

        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const { slug } = params;
        const deleted = await deleteTemplate(env.DB, slug || '');
        
        if (!deleted) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Template not found', 404)
            );
            return new Response(body, { status, headers });
        }
        
        const { body, status, headers } = formatSuccessResponse({ message: 'Template deleted successfully' });
        return new Response(body, { status, headers });
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
