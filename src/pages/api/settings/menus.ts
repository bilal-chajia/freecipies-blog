/**
 * Menus API
 *
 * GET  - Retrieve all menus or specific menu by key
 * PUT  - Update menu by key (upsert)
 * POST - Create new menu
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
    getMenuByKey,
    getMenuDocument,
    getMenuItems,
    createMenu,
    deleteMenuByKey,
    saveMenuDocument,
} from '@modules/menus/services/menus.service';
import { transformMenuResponse } from '@modules/menus/api/helpers';
import type { MenuDocument, MenuItem } from '@modules/menus/types/menus.types';
import { validateBody, validateQuery } from '@shared/validation';
import { SaveMenusSchema, CreateMenuSchema, DeleteMenuQuery } from '@shared/validation/schemas/settings';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

const getSettingsCache = () => env?.SETTINGS_CACHE ?? env?.SESSION ?? null;

/**
 * GET /api/settings/menus
 * GET /api/settings/menus?key=header
 */
export const GET: APIRoute = async ({ url }) => {
    try {
        const db = env?.DB;
        if (!db) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
            );
            return new Response(body, { status, headers });
        }

        const key = url.searchParams.get('key');

        if (key) {
            const menu = await getMenuByKey(db, key, { cache: getSettingsCache() });
            if (!menu) {
                const items = await getMenuItems(db, key, { cache: getSettingsCache() });
                const { body, status, headers } = formatSuccessResponse({ key, items });
                return new Response(body, { status, headers });
            }
            const { body, status, headers } = formatSuccessResponse(transformMenuResponse(menu));
            return new Response(body, { status, headers });
        }

        const headerDocument = await getMenuDocument(db, 'header', { cache: getSettingsCache() });
        const footerDocument = await getMenuDocument(db, 'footer', { cache: getSettingsCache() });
        const mobileDocument = await getMenuDocument(db, 'mobile', { cache: getSettingsCache() });
        const sidebarDocument = await getMenuDocument(db, 'sidebar', { cache: getSettingsCache() });

        const { body, status, headers } = formatSuccessResponse({
            menu_header: headerDocument,
            menu_footer: footerDocument,
            menu_mobile: mobileDocument,
            menu_sidebar: sidebarDocument,
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching menus:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch menus', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * PUT /api/settings/menus
 * Updates header and/or footer menu (for admin panel compatibility)
 *
 * Body: { menu_header?: MenuDocument, menu_footer?: MenuDocument, menu_mobile?: MenuDocument, menu_sidebar?: MenuDocument }
 */
export const PUT: APIRoute = async ({ request }) => {
    try {
        const db = env?.DB;
        if (!db) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
            );
            return new Response(body, { status, headers });
        }

        const body = await validateBody(request, SaveMenusSchema);

        if (body.menu_header !== undefined) {
            await saveMenuDocument(db, 'header', body.menu_header as MenuDocument, {
                cache: getSettingsCache(),
            });
        }

        if (body.menu_footer !== undefined) {
            await saveMenuDocument(db, 'footer', body.menu_footer as MenuDocument, {
                cache: getSettingsCache(),
            });
        }

        if (body.menu_mobile !== undefined) {
            await saveMenuDocument(db, 'mobile', body.menu_mobile as MenuDocument, {
                cache: getSettingsCache(),
            });
        }

        if (body.menu_sidebar !== undefined) {
            await saveMenuDocument(db, 'sidebar', body.menu_sidebar as MenuDocument, {
                cache: getSettingsCache(),
            });
        }

        const headerDocument = await getMenuDocument(db, 'header', { cache: getSettingsCache() });
        const footerDocument = await getMenuDocument(db, 'footer', { cache: getSettingsCache() });
        const mobileDocument = await getMenuDocument(db, 'mobile', { cache: getSettingsCache() });
        const sidebarDocument = await getMenuDocument(db, 'sidebar', { cache: getSettingsCache() });

        const { body: responseBody, status, headers } = formatSuccessResponse({
            menu_header: headerDocument,
            menu_footer: footerDocument,
            menu_mobile: mobileDocument,
            menu_sidebar: sidebarDocument,
        });
        return new Response(responseBody, { status, headers });
    } catch (error: unknown) {
        console.error('Error updating menus:', error);

        const err = error as { code?: string; message?: string };
        if (err.code === 'VALIDATION_ERROR') {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, err.message || 'Validation failed', 400)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update menus', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * POST /api/settings/menus
 * Create a new menu
 *
 * Body: { key: string, label: string, items?: MenuItem[], location?: string }
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        const db = env?.DB;
        if (!db) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
            );
            return new Response(body, { status, headers });
        }

        const body = await validateBody(request, CreateMenuSchema);

        const menu = await createMenu(db, {
            key: body.key,
            label: body.label,
            items: body.items as MenuItem[] | undefined,
            location: body.location,
            description: body.description,
        }, {
            cache: getSettingsCache(),
        });

        if (!menu) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create menu', 500)
            );
            return new Response(body, { status, headers });
        }

        const { body: responseBody, status, headers } = formatSuccessResponse({
            menu: transformMenuResponse(menu),
        });
        return new Response(responseBody, { status, headers });
    } catch (error: unknown) {
        console.error('Error creating menu:', error);

        const err = error as { code?: string; message?: string };
        if (err.code === 'VALIDATION_ERROR') {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, err.message || 'Validation failed', 400)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create menu', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * DELETE /api/settings/menus?key=xxx
 */
export const DELETE: APIRoute = async ({ url }) => {
    try {
        const db = env?.DB;
        if (!db) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
            );
            return new Response(body, { status, headers });
        }

        const { key } = validateQuery(url.searchParams, DeleteMenuQuery);

        const deleted = await deleteMenuByKey(db, key, { cache: getSettingsCache() });

        if (!deleted) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, 'Menu not found', 404)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ deleted });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting menu:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete menu', 500)
        );
        return new Response(body, { status, headers });
    }
};
