/**
 * Category Page Settings API (global)
 *
 * GET  - Retrieve global category page settings
 * PUT  - Update global category page settings
 *
 * These settings are uniform across all category pages
 * (site_settings.category_page_settings). Per-category editorial content
 * lives on categories.presentation_json, not here.
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getCategoryPageSettings, updateCategoryPageSettings } from '@modules/settings/services/settings.service';
import { validateBody } from '@shared/validation';
import { CategoryPageSettingsSchema } from '@shared/validation/schemas/settings';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils/error-handler';

const getSettingsCache = () => env?.SETTINGS_CACHE ?? env?.SESSION ?? null;

/** GET /api/settings/category-page */
export const GET: APIRoute = async () => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
      );
      return new Response(body, { status, headers });
    }

    const settings = await getCategoryPageSettings(db, { cache: getSettingsCache() });

    const { body, status, headers } = formatSuccessResponse({ category_page: settings });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching category page settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch category page settings', 500)
    );
    return new Response(body, { status, headers });
  }
};

/** PUT /api/settings/category-page — Body: Partial<CategoryPageSettings> */
export const PUT: APIRoute = async ({ request }) => {
  try {
    const db = env?.DB;
    if (!db) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not available', 500)
      );
      return new Response(body, { status, headers });
    }

    const body = await validateBody(request, CategoryPageSettingsSchema);
    const updated = await updateCategoryPageSettings(db, body, { cache: getSettingsCache() });

    const { body: responseBody, status, headers } = formatSuccessResponse({ category_page: updated });
    return new Response(responseBody, { status, headers });
  } catch (error) {
    console.error('Error updating category page settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update category page settings', 500)
    );
    return new Response(body, { status, headers });
  }
};
