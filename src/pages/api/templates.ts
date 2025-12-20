import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

// GET /api/templates - List all templates
export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const url = new URL(request.url);
        const isActive = url.searchParams.get('is_active') !== 'false';

        let query = `
      SELECT 
        id, slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active,
        created_at, updated_at
      FROM pin_templates
      WHERE 1=1
    `;
        const params: any[] = [];

        if (isActive) {
            query += ' AND is_active = 1';
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.prepare(query).bind(...params).all();

        // Parse elements_json for each template
        const templates = (result.results || []).map((t: any) => ({
            ...t,
            elements_json: t.elements_json ? JSON.parse(t.elements_json) : [],
        }));

        const { body, status, headers } = formatSuccessResponse(templates, {
            cacheControl: 'no-cache, no-store, must-revalidate'
        });
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

        const body = await request.json();
        const {
            slug,
            name,
            description = '',
            thumbnail_url = null,
            width = 1000,
            height = 1500,
            category = 'general',
            elements_json = '[]',
            is_active = true,
        } = body;

        if (!slug || !name) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug and name are required', 400);
        }

        // Ensure elements_json is a string
        const elementsStr = typeof elements_json === 'string'
            ? elements_json
            : JSON.stringify(elements_json);

        const result = await db.prepare(`
      INSERT INTO pin_templates (
        slug, name, description, thumbnail_url,
        width, height, category,
        elements_json, is_active
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `).bind(
            slug,
            name,
            description,
            thumbnail_url,
            width,
            height,
            category,
            elementsStr,
            is_active ? 1 : 0
        ).run();

        if (!result.success) {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create template', 500);
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                id: result.meta?.last_row_id,
                slug,
                message: 'Template created successfully'
            }
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Error creating template:', error);
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
