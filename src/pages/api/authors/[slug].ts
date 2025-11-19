import type { APIRoute } from 'astro';
import {
    getAuthorBySlug, updateAuthor, deleteAuthor, type Env
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
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const author = await getAuthorBySlug(db, slug);

        if (!author) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Author not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(author, {
            cacheControl: 'public, max-age=3600'
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching author:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(
                    ErrorCodes.DATABASE_ERROR,
                    'Failed to fetch author',
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
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json();
        const author = await updateAuthor(env.DB, slug, body);

        if (!author) {
            return new Response(JSON.stringify({ error: 'Author not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(author), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error updating author:', error);
        return new Response(JSON.stringify({ error: 'Failed to update author' }), {
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
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const success = await deleteAuthor(env.DB, slug);

        if (!success) {
            return new Response(JSON.stringify({ error: 'Author not found or failed to delete' }), { status: 404 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error deleting author:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete author' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
