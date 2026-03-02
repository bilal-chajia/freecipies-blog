import type { APIRoute } from 'astro';
import {
    getEquipment,
    getEquipmentBySlug,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    matchEquipmentInText,
    refreshCachedEquipmentForArticles,
} from '@modules/equipment';
import { transformEquipmentRequestBody, transformEquipmentResponse } from '@modules/equipment';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

/**
 * GET /api/equipment
 * - ?match=TEXT → auto-detect equipment in text
 * - ?slug=SLUG → get single by slug
 * - default → list all active
 */
export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        const url = new URL(request.url);
        const matchText = url.searchParams.get('match');
        const slug = url.searchParams.get('slug');
        const category = url.searchParams.get('category') || undefined;
        const activeOnly = url.searchParams.get('active') !== 'false';

        // Auto-detect equipment in text
        if (matchText) {
            const matched = await matchEquipmentInText(env.DB, matchText);
            const responseData = matched.map(transformEquipmentResponse);
            const { body, status, headers } = formatSuccessResponse(responseData);
            return new Response(body, { status, headers });
        }

        // Get single by slug
        if (slug) {
            const item = await getEquipmentBySlug(env.DB, slug);
            if (!item) {
                throw new AppError(ErrorCodes.NOT_FOUND, `Equipment "${slug}" not found`, 404);
            }
            const { body, status, headers } = formatSuccessResponse(transformEquipmentResponse(item));
            return new Response(body, { status, headers });
        }

        // List all
        const items = await getEquipment(env.DB, { category, activeOnly });
        const responseData = items.map(transformEquipmentResponse);

        const { body, status, headers } = formatSuccessResponse(responseData, {
            cacheControl: 'public, max-age=3600',
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching equipment:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch equipment', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * POST /api/equipment — Create new equipment
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const reqBody = await request.json();
        const transformedBody = transformEquipmentRequestBody(reqBody);
        const item = await createEquipment(env.DB, transformedBody);
        const responseItem = transformEquipmentResponse(item);

        const { body, status, headers } = formatSuccessResponse(responseItem);
        return new Response(body, { status: 201, headers });
    } catch (error) {
        console.error('Error creating equipment:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create equipment', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PUT /api/equipment?slug=SLUG — Update equipment
 */
export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const url = new URL(request.url);
        const slug = url.searchParams.get('slug');
        if (!slug) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'slug query parameter required', 400);
        }

        const reqBody = await request.json();
        const transformedBody = transformEquipmentRequestBody(reqBody);
        const item = await updateEquipment(env.DB, slug, transformedBody);
        const responseItem = transformEquipmentResponse(item);

        // Cascade: refresh cachedEquipmentJson in all articles referencing this item
        if (item?.id) {
            refreshCachedEquipmentForArticles(env.DB, item.id)
                .then((count) => { if (count > 0) console.log(`Refreshed equipment cache in ${count} articles`); })
                .catch((err) => console.error('Failed to cascade equipment update:', err));
        }

        const { body, status, headers } = formatSuccessResponse(responseItem);
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error updating equipment:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to update equipment', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * DELETE /api/equipment?slug=SLUG — Soft-delete equipment
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const url = new URL(request.url);
        const slug = url.searchParams.get('slug');
        if (!slug) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'slug query parameter required', 400);
        }

        await deleteEquipment(env.DB, slug);

        const { body, status, headers } = formatSuccessResponse({ deleted: true });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete equipment', 500)
        );
        return new Response(body, { status, headers });
    }
};
