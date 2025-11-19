import type { APIRoute } from 'astro';
import {
    getCategoryBySlug, updateCategory, deleteCategory, type Env
} from '../../../lib/db';
import {
    formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../../lib/error-handler';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, params, locals }) => {
    const { slug } = params;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Slug is required' }), { status: 400 });
    }

    try {
        const env = locals.runtime.env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const category = await getCategoryBySlug(db, slug);

        if (!category) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Category not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(category, {
            cacheControl: 'public, max-age=3600'
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching category:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch category',
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
        return new Response(JSON.stringify({ error: 'Slug is required' }), { status: 400 });
    }

    try {
        const env = locals.runtime.env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json();
        const category = await updateCategory(env.DB, slug, body);

        if (!category) {
            return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(category), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating category:', error);
        return new Response(JSON.stringify({ error: 'Failed to update category' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
    const { slug } = params;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Slug is required' }), { status: 400 });
    }

    try {
        const env = locals.runtime.env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const success = await deleteCategory(env.DB, slug);

        if (!success) {
            return new Response(JSON.stringify({ error: 'Category not found or failed to delete' }), { status: 404 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete category' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
