/**
 * Appearance Settings API
 * 
 * GET  - Retrieve appearance settings (TOC config, etc.)
 * PUT  - Update appearance settings
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getTocSettings, updateTocSettings } from '@modules/settings/services/settings.service';
import type { TocSettings } from '@modules/settings/types/settings.types';
import { validateBody } from '@shared/validation';
import { AppearanceSchema } from '@shared/validation/schemas/settings';

const getSettingsCache = () => env?.SETTINGS_CACHE ?? env?.SESSION ?? null;

/**
 * GET /api/settings/appearance
 * Returns all appearance-related settings
 */
export const GET: APIRoute = async ({ locals }) => {
    try {
        const db = env?.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const tocSettings = await getTocSettings(db, { cache: getSettingsCache() });

        return new Response(JSON.stringify({
            success: true,
            toc: tocSettings,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching appearance settings:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch appearance settings' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

/**
 * PUT /api/settings/appearance
 * Update appearance settings
 * 
 * Body: { toc?: Partial<TocSettings> }
 */
export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const db = env?.DB;
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database not available' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await validateBody(request, AppearanceSchema);
        let updatedToc: TocSettings | null = null;

        // Update TOC settings if provided
        if (body.toc) {
            updatedToc = await updateTocSettings(db, body.toc, { cache: getSettingsCache() });
        }

        // Get current settings for response
        const tocSettings = updatedToc || await getTocSettings(db, { cache: getSettingsCache() });

        return new Response(JSON.stringify({
            success: true,
            toc: tocSettings,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating appearance settings:', error);
        return new Response(JSON.stringify({ error: 'Failed to update appearance settings' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
