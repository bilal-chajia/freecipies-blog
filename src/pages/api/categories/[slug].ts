import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { resolveVariantUrl } from '@shared/types/images';
import {
    getCategoryBySlug,
    getCategoryById,
    updateCategory,
    updateCategoryById,
    deleteCategory,
    deleteCategoryById,
    transformCategoryRequestBody,
    transformCategoryResponse
} from '@modules/categories';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { validateParams, validateBody, SlugOrIdParam, UpdateCategorySchema } from '@shared/validation';

export const prerender = false;

const getThumbnailUrlFromImagesJson = (value: any): string | null => {
    if (!value) return null;
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        const primarySlot = parsed?.thumbnail ?? parsed?.hero;
        if (!primarySlot) return null;
        if (primarySlot.variants && typeof primarySlot.variants === 'object') {
            const variant =
                primarySlot.variants.lg ||
                primarySlot.variants.md ||
                primarySlot.variants.sm ||
                primarySlot.variants.xs;
            return resolveVariantUrl(variant) || null;
        }
        return primarySlot.url || null;
    } catch {
        return null;
    }
};

export const GET: APIRoute = async ({ request, params, locals }) => {
    const { slug } = validateParams(params, SlugOrIdParam);

    try {

        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }
        const db = env.DB;

        const isNumeric = /^\d+$/.test(slug);
        const category = isNumeric
            ? await getCategoryById(db, parseInt(slug, 10))
            : await getCategoryBySlug(db, slug);

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
    const { slug } = validateParams(params, SlugOrIdParam);

    try {

        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await validateBody(request, UpdateCategorySchema);
        const transformedBody = transformCategoryRequestBody(body);

        // DEBUG: Check if iconSvg is in the transformed body
        console.log('Backend received iconSvg:', transformedBody.iconSvg ? transformedBody.iconSvg.substring(0, 50) : 'NOT PRESENT');

        const isNumeric = /^\d+$/.test(slug);

        const category = isNumeric
            ? await updateCategoryById(env.DB, parseInt(slug, 10), transformedBody)
            : await updateCategory(env.DB, slug, transformedBody);

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
        const appErr = error instanceof AppError
            ? error
            : (error as any)?.code === 'VALIDATION_ERROR'
                ? new AppError(ErrorCodes.VALIDATION_ERROR, (error as Error).message, 400)
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update category', 500);

        const { body, status, headers } = formatErrorResponse(appErr);
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
    const { slug } = validateParams(params, SlugOrIdParam);

    try {

        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const isNumeric = /^\d+$/.test(slug);
        const success = isNumeric
            ? await deleteCategoryById(env.DB, parseInt(slug, 10))
            : await deleteCategory(env.DB, slug);

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
