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

        const author = await getAuthorBySlug(db, slug);

        if (!author) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Author not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse(author, {
            cacheControl: 'no-cache, no-store, must-revalidate'
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

        // Check if image is being changed or removed - delete old image if so
        const existingAuthor = await getAuthorBySlug(env.DB, slug);
        const oldImageUrl = existingAuthor?.image?.url;
        const newImageUrl = body.image?.url;

        // Delete old image if: 1) new image is different, or 2) image is being removed (set to null)
        if (oldImageUrl && (newImageUrl !== oldImageUrl || body.image === null)) {
            try {
                // URL format: /images/{key} - key is everything after /images/
                const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
                if (keyMatch && env.IMAGES) {
                    const oldKey = keyMatch[1];
                    console.log(`Deleting old author image with key: ${oldKey}`);
                    await env.IMAGES.delete(oldKey);
                    // Also delete from media table
                    await env.DB.prepare('DELETE FROM media WHERE r2_key = ?').bind(oldKey).run();
                    console.log(`Successfully deleted old author image: ${oldKey}`);
                }
            } catch (deleteErr) {
                console.warn('Failed to delete old author image:', deleteErr);
                // Continue with update even if delete fails
            }
        }

        const author = await updateAuthor(env.DB, slug, body);

        if (!author) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Author not found', 404)
            );
            return new Response(errBody, { status, headers });
        }

        const { body: respBody, status, headers } = formatSuccessResponse(author);
        return new Response(respBody, { status, headers });
    } catch (error) {
        console.error('Error updating author:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update author', 500)
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

        const success = await deleteAuthor(env.DB, slug);

        if (!success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Author not found or failed to delete', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ deleted: true });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting author:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete author', 500)
        );
        return new Response(body, { status, headers });
    }
};
