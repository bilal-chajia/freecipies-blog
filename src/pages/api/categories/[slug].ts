import type { APIRoute } from 'astro';
import { getCategoryBySlug, updateCategory, deleteCategory, transformCategoryRequestBody, transformCategoryResponse } from '@modules/categories';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

const getThumbnailUrlFromImagesJson = (value: any): string | null => {
    if (!value) return null;
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        const primarySlot = parsed?.thumbnail ?? parsed?.cover;
        if (!primarySlot) return null;
        if (primarySlot.variants && typeof primarySlot.variants === 'object') {
            const variant =
                primarySlot.variants.lg ||
                primarySlot.variants.md ||
                primarySlot.variants.sm ||
                primarySlot.variants.original ||
                primarySlot.variants.xs;
            return variant?.url || null;
        }
        return primarySlot.url || null;
    } catch {
        return null;
    }
};

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
        const responseCategory = transformCategoryResponse(category);
        const { body, status, headers } = formatSuccessResponse(responseCategory, {
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
        const transformedBody = transformCategoryRequestBody(body);

        // Check if image is being changed or removed - delete old image if so
        const existingCategory = await getCategoryBySlug(env.DB, slug);
        const oldImageUrl = getThumbnailUrlFromImagesJson(existingCategory?.imagesJson);
        const shouldCheckImage = transformedBody.imagesJson !== undefined;
        const newImageUrl = shouldCheckImage
            ? getThumbnailUrlFromImagesJson(transformedBody.imagesJson)
            : null;

        // Debug logging
        console.log('Image update check:', {
            oldImageUrl,
            newImageUrl,
            bodyImagesJsonProvided: shouldCheckImage,
            shouldDelete: shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl
        });

        // Delete old image if a new imagesJson was provided and URL changed or removed
        if (shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl) {
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

        const category = await updateCategory(env.DB, slug, transformedBody);

        if (!category) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Category not found', 404)
            );
            return new Response(errBody, { status, headers });
        }

        const responseCategory = transformCategoryResponse(category);
        const { body: respBody, status, headers } = formatSuccessResponse(responseCategory);
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
