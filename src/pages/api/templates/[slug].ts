import type { APIRoute } from 'astro';
import type { Env } from '../../../lib/db';
import {
    formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../../lib/error-handler';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../../lib/auth';

export const prerender = false;

// GET /api/templates/[slug] - Get single template by slug
export const GET: APIRoute = async ({ params, request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const { slug } = params;

        if (!slug) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400);
        }

        const result = await db.prepare(`
      SELECT 
        id, slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active,
        created_at, updated_at
      FROM pin_templates
      WHERE slug = ?1
    `).bind(slug).first();

        if (!result) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Template not found', 404);
        }

        // Parse elements_json
        const template = {
            ...result,
            elements_json: result.elements_json ? JSON.parse(result.elements_json as string) : [],
        };

        const { body, status, headers } = formatSuccessResponse(template, {
            cacheControl: 'no-cache, no-store, must-revalidate'
        });
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
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const { slug } = params;

        if (!slug) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400);
        }

        const body = await request.json();
        const {
            name,
            description,
            thumbnail_url,
            width,
            height,
            category,
            elements_json,
            is_active,
            slug: newSlug,
        } = body;

        // Ensure elements_json is a string
        const elementsStr = elements_json
            ? (typeof elements_json === 'string' ? elements_json : JSON.stringify(elements_json))
            : undefined;

        // Build dynamic update
        const updates: string[] = [];
        const updateParams: any[] = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = ?${paramIndex++}`);
            updateParams.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = ?${paramIndex++}`);
            updateParams.push(description);
        }
        if (thumbnail_url !== undefined) {
            updates.push(`thumbnail_url = ?${paramIndex++}`);
            updateParams.push(thumbnail_url);
        }
        if (width !== undefined) {
            updates.push(`width = ?${paramIndex++}`);
            updateParams.push(width);
        }
        if (height !== undefined) {
            updates.push(`height = ?${paramIndex++}`);
            updateParams.push(height);
        }
        if (category !== undefined) {
            updates.push(`category = ?${paramIndex++}`);
            updateParams.push(category);
        }
        if (elementsStr !== undefined) {
            updates.push(`elements_json = ?${paramIndex++}`);
            updateParams.push(elementsStr);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = ?${paramIndex++}`);
            updateParams.push(is_active ? 1 : 0);
        }
        if (newSlug !== undefined && newSlug !== slug) {
            updates.push(`slug = ?${paramIndex++}`);
            updateParams.push(newSlug);
        }

        if (updates.length === 0) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No updates provided', 400);
        }

        // Add slug for WHERE clause
        updateParams.push(slug);

        const query = `
      UPDATE pin_templates 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE slug = ?${paramIndex}
    `;

        const result = await db.prepare(query).bind(...updateParams).run();

        if (result.meta?.changes === 0) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Template not found', 404);
        }

        const { body: respBody, status, headers } = formatSuccessResponse({
            slug: newSlug || slug,
            message: 'Template updated successfully'
        });
        return new Response(respBody, { status, headers });
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
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const { slug } = params;

        if (!slug) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400);
        }

        const result = await db.prepare(`
      DELETE FROM pin_templates WHERE slug = ?1
    `).bind(slug).run();

        if (result.meta?.changes === 0) {
            throw new AppError(ErrorCodes.NOT_FOUND, 'Template not found', 404);
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
