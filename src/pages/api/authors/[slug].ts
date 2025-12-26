import type { APIRoute } from 'astro';
import { getAuthorBySlug, updateAuthor, deleteAuthor, transformAuthorRequestBody, transformAuthorResponse } from '@modules/authors';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

const getAvatarUrlFromImagesJson = (value: any): string | null => {
    if (!value) return null;
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        const avatar = parsed?.avatar;
        if (!avatar) return null;
        if (avatar.variants && typeof avatar.variants === 'object') {
            const variant =
                avatar.variants.lg ||
                avatar.variants.md ||
                avatar.variants.sm ||
                avatar.variants.original ||
                avatar.variants.xs;
            return variant?.url || null;
        }
        return avatar.url || null;
    } catch {
        return null;
    }
};

export const GET: APIRoute = async ({ request, params, locals }) => {
    const { slug } = params;
    console.log(`[DEBUG] GET /api/authors/[slug] called with slug: "${slug}"`);

    if (!slug) {
        console.log('[DEBUG] Slug is missing');
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug or ID is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        console.log('[DEBUG] Connecting to DB...');
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        // Smart routing: check if it's a number (ID) or string (slug)
        const isNumeric = /^\d+$/.test(slug);
        let author;

        if (isNumeric) {
            // It's an ID - use getAuthorById
            const { getAuthorById } = await import('@modules/authors');
            author = await getAuthorById(db, parseInt(slug));
        } else {
            // It's a slug - use getAuthorBySlug
            author = await getAuthorBySlug(db, slug);
        }

        if (!author) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Author not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const responseAuthor = transformAuthorResponse(author);
        const { body, status, headers } = formatSuccessResponse(responseAuthor, {
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
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug or ID is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json();
        const transformedBody = transformAuthorRequestBody(body);

        // Smart routing: check if it's a number (ID) or string (slug)
        const isNumeric = /^\d+$/.test(slug);
        let author;

        // Handle old image deletion if image is changing
        let existingAuthor;
        if (isNumeric) {
            const { getAuthorById, updateAuthorById } = await import('@modules/authors');
            existingAuthor = await getAuthorById(env.DB, parseInt(slug));

            // Delete old image if needed (check imagesJson)
            const oldImageUrl = getAvatarUrlFromImagesJson(existingAuthor?.imagesJson);
            const shouldCheckImage = transformedBody.imagesJson !== undefined;
            const newImageUrl = shouldCheckImage
                ? getAvatarUrlFromImagesJson(transformedBody.imagesJson)
                : null;

            if (shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl && env.IMAGES) {
                try {
                    const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
                    if (keyMatch) {
                        const oldKey = keyMatch[1];
                        await env.IMAGES.delete(oldKey);
                        await env.DB.prepare('DELETE FROM media WHERE r2_key = ?').bind(oldKey).run();
                    }
                } catch (deleteErr) {
                    console.warn('Failed to delete old author image:', deleteErr);
                }
            }

            author = await updateAuthorById(env.DB, parseInt(slug), transformedBody);
        } else {
            existingAuthor = await getAuthorBySlug(env.DB, slug);
            const oldImageUrl = getAvatarUrlFromImagesJson(existingAuthor?.imagesJson);
            const shouldCheckImage = transformedBody.imagesJson !== undefined;
            const newImageUrl = shouldCheckImage
                ? getAvatarUrlFromImagesJson(transformedBody.imagesJson)
                : null;

            if (shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl && env.IMAGES) {
                try {
                    const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
                    if (keyMatch) {
                        const oldKey = keyMatch[1];
                        await env.IMAGES.delete(oldKey);
                        await env.DB.prepare('DELETE FROM media WHERE r2_key = ?').bind(oldKey).run();
                    }
                } catch (deleteErr) {
                    console.warn('Failed to delete old author image:', deleteErr);
                }
            }

            author = await updateAuthor(env.DB, slug, transformedBody);
        }

        if (!author) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Author not found', 404)
            );
            return new Response(errBody, { status, headers });
        }

        const responseAuthor = transformAuthorResponse(author);
        const { body: respBody, status, headers } = formatSuccessResponse(responseAuthor);
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
