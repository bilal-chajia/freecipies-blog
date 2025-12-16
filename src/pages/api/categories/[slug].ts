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
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
        );
        return new Response(body, { status, headers });
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

        // Disable caching for admin panel to always get fresh data
        const { body, status, headers } = formatSuccessResponse(category, {
            cacheControl: 'no-cache, no-store, must-revalidate'
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
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Slug is required', 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = locals.runtime.env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json();

        // Check if image is being changed or removed - delete old image if so
        const existingCategory = await getCategoryBySlug(env.DB, slug);
        const oldImageUrl = existingCategory?.imageUrl;
        const newImageUrl = body.imageUrl;

        // Debug logging
        console.log('Image update check:', {
            oldImageUrl,
            newImageUrl,
            bodyImageUrl: body.imageUrl,
            bodyImageUrlIsNull: body.imageUrl === null,
            bodyImageUrlIsUndefined: body.imageUrl === undefined,
            shouldDelete: oldImageUrl && (newImageUrl !== oldImageUrl || body.imageUrl === null)
        });

        // Delete old image if: 1) new image is different, or 2) image is being removed (set to null)
        if (oldImageUrl && (newImageUrl !== oldImageUrl || body.imageUrl === null)) {
            try {
                // URL format: /images/{key} - key is everything after /images/
                const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
                if (keyMatch && env.IMAGES) {
                    const oldKey = keyMatch[1];
                    console.log(`Deleting old category image with key: ${oldKey}`);

                    // Just delete - R2 delete() is idempotent, doesn't throw if key doesn't exist
                    await env.IMAGES.delete(oldKey);

                    // Delete from media table by r2_key OR by url (fallback)
                    const deleteResult = await env.DB.prepare(
                        'DELETE FROM media WHERE r2_key = ? OR url = ?'
                    ).bind(oldKey, oldImageUrl).run();

                    console.log(`Deleted category image. Key: ${oldKey}, Media rows affected: ${deleteResult.meta?.changes || 0}`);
                }
            } catch (deleteErr) {
                console.warn('Failed to delete old category image:', deleteErr);
                // Continue with update even if delete fails
            }
        }

        const category = await updateCategory(env.DB, slug, body);

        if (!category) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Category not found', 404)
            );
            return new Response(errBody, { status, headers });
        }

        const { body: respBody, status, headers } = formatSuccessResponse(category);
        return new Response(respBody, { status, headers });
    } catch (error) {
        console.error('Error updating category:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update category', 500)
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
        const env = locals.runtime.env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const success = await deleteCategory(env.DB, slug);

        if (!success) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Category not found or failed to delete', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ deleted: true });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting category:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete category', 500)
        );
        return new Response(body, { status, headers });
    }
};
