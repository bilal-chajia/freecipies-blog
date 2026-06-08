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
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

const getSettingsCache = () => env?.SETTINGS_CACHE ?? env?.SESSION ?? null;

/**
 * GET /api/settings/appearance
 * Returns all appearance-related settings
 */
export const GET: APIRoute = async () => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
      );
      return new Response(body, { status, headers });
    }

    const tocSettings = await getTocSettings(db, { cache: getSettingsCache() });

    const { body, status, headers } = formatSuccessResponse({ toc: tocSettings });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching appearance settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch appearance settings', 500)
    );
    return new Response(body, { status, headers });
  }
};

/**
 * PUT /api/settings/appearance
 * Update appearance settings
 *
 * Body: { toc?: Partial<TocSettings> }
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

    const body = await validateBody(request, AppearanceSchema);
    let updatedToc: TocSettings | null = null;

    if (body.toc) {
      updatedToc = await updateTocSettings(db, body.toc, { cache: getSettingsCache() });
    }

    const tocSettings = updatedToc || await getTocSettings(db, { cache: getSettingsCache() });

    const { body: responseBody, status, headers } = formatSuccessResponse({ toc: tocSettings });
    return new Response(responseBody, { status, headers });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update appearance settings', 500)
    );
    return new Response(body, { status, headers });
  }
};
