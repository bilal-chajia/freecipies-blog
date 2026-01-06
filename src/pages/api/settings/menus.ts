/**
 * Menus API
 * 
 * GET  - Retrieve all menus or specific menu by key
 * PUT  - Update menu by key (upsert)
 * POST - Create new menu
 */

import type { APIRoute } from 'astro';
import {
    getMenuByKey,
    getMenuItems,
    upsertMenu,
    createMenu,
    deleteMenuByKey,
} from '@modules/menus/services/menus.service';
import { transformMenuResponse } from '@modules/menus/api/helpers';
import type { MenuItem } from '@modules/menus/types/menus.types';

/**
 * GET /api/settings/menus
 * GET /api/settings/menus?key=header
 */
export const GET: APIRoute = async ({ url, locals }) => {
    try {
        const db = locals.runtime?.env?.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const key = url.searchParams.get('key');

        if (key) {
            // Get specific menu
            const menu = await getMenuByKey(db, key);
            if (!menu) {
                // Return default items for known keys
                const items = await getMenuItems(db, key);
                return new Response(JSON.stringify({
                    key,
                    items,
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return new Response(JSON.stringify(transformMenuResponse(menu)), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get all menus (for admin panel compatibility, return headerMenu/footerMenu format)
        const headerItems = await getMenuItems(db, 'header');
        const footerItems = await getMenuItems(db, 'footer');

        return new Response(JSON.stringify({
            headerMenu: headerItems,
            footerMenu: footerItems,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching menus:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch menus' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

/**
 * PUT /api/settings/menus
 * Updates header and/or footer menu (for admin panel compatibility)
 * 
 * Body: { headerMenu?: MenuItem[], footerMenu?: MenuItem[] }
 */
export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const db = locals.runtime?.env?.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();

        // Update header menu if provided
        if (body.headerMenu !== undefined) {
            await upsertMenu(db, 'header', {
                label: 'Header Menu',
                items: body.headerMenu as MenuItem[],
                location: 'header',
                description: 'Primary navigation in site header',
            });
        }

        // Update footer menu if provided
        if (body.footerMenu !== undefined) {
            await upsertMenu(db, 'footer', {
                label: 'Footer Menu',
                items: body.footerMenu as MenuItem[],
                location: 'footer',
                description: 'Footer navigation links',
            });
        }

        // Return updated menus
        const headerItems = await getMenuItems(db, 'header');
        const footerItems = await getMenuItems(db, 'footer');

        return new Response(JSON.stringify({
            success: true,
            headerMenu: headerItems,
            footerMenu: footerItems,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Error updating menus:', error);

        if (error.code === 'VALIDATION_ERROR') {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Failed to update menus' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

/**
 * POST /api/settings/menus
 * Create a new menu
 * 
 * Body: { key: string, label: string, items?: MenuItem[], location?: string }
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const db = locals.runtime?.env?.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();

        if (!body.key || typeof body.key !== 'string') {
            return new Response(JSON.stringify({ error: 'key is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!body.label || typeof body.label !== 'string') {
            return new Response(JSON.stringify({ error: 'label is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const menu = await createMenu(db, {
            key: body.key,
            label: body.label,
            items: body.items,
            location: body.location,
            description: body.description,
        });

        if (!menu) {
            return new Response(JSON.stringify({ error: 'Failed to create menu' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({
            success: true,
            menu: transformMenuResponse(menu),
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Error creating menu:', error);

        if (error.code === 'VALIDATION_ERROR') {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Failed to create menu' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

/**
 * DELETE /api/settings/menus?key=xxx
 */
export const DELETE: APIRoute = async ({ url, locals }) => {
    try {
        const db = locals.runtime?.env?.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const key = url.searchParams.get('key');
        if (!key) {
            return new Response(JSON.stringify({ error: 'key parameter is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const deleted = await deleteMenuByKey(db, key);

        return new Response(JSON.stringify({
            success: deleted,
        }), {
            status: deleted ? 200 : 404,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error deleting menu:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete menu' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
