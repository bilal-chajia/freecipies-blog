/**
 * Homepage Settings API (global)
 *
 * GET  - Retrieve homepage settings (seo + ordered sections)
 * PUT  - Update homepage settings (partial: seo and/or full sections array)
 *
 * Source of truth: site_settings.homepage_settings (see SITE_SETTINGS_TABLE_CONTRACT.md).
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  normalizeHomepageSettingsFromAdmin,
  presentHomepageSettingsForAdmin,
} from '@modules/settings/services/homepage-settings-images';
import { getHomepageSettings, updateHomepageSettings } from '@modules/settings/services/settings.service';
import type { HomepageAdminSettings } from '@modules/settings/types/settings.types';
import { validateBody } from '@shared/validation';
import { HomepageSettingsSchema } from '@shared/validation/schemas/settings';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

const getSettingsCache = () => env?.SETTINGS_CACHE ?? env?.SESSION ?? null;

/** GET /api/settings/homepage */
export const GET: APIRoute = async () => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500),
      );
      return new Response(body, { status, headers });
    }

    const settings = await getHomepageSettings(db, { cache: getSettingsCache() });

    const { body, status, headers } = formatSuccessResponse({
      homepage: presentHomepageSettingsForAdmin(settings),
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching homepage settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch homepage settings', 500),
    );
    return new Response(body, { status, headers });
  }
};

/** PUT /api/settings/homepage — Body: Partial<HomepageAdminSettings> */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500),
      );
      return new Response(body, { status, headers });
    }

    const body = await validateBody(request, HomepageSettingsSchema);
    const updates = normalizeHomepageSettingsFromAdmin(body as Partial<HomepageAdminSettings>);
    const updated = await updateHomepageSettings(db, updates, { cache: getSettingsCache() });

    const { body: responseBody, status, headers } = formatSuccessResponse({
      homepage: presentHomepageSettingsForAdmin(updated),
    });
    return new Response(responseBody, { status, headers });
  } catch (error) {
    console.error('Error updating homepage settings:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update homepage settings', 500),
    );
    return new Response(body, { status, headers });
  }
};
