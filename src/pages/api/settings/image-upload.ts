import type { APIRoute } from 'astro';
import { getImageUploadSettings, updateImageUploadSettings, resetImageUploadSettings, IMAGE_UPLOAD_DEFAULTS } from '@modules/settings';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

/**
 * GET /api/settings/image-upload
 * Returns merged image upload settings (defaults + stored overrides)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env as Env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    // Check authentication (viewer+ can read settings)
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.VIEWER)) {
      return createAuthError('Authentication required', 401);
    }

    const settings = await getImageUploadSettings(env.DB);

    const { body, status, headers } = formatSuccessResponse({
      success: true,
      data: settings,
      defaults: IMAGE_UPLOAD_DEFAULTS,
    });
    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Error fetching image upload settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch settings', 500)
    );
    return new Response(body, { status, headers });
  }
};

/**
 * PUT /api/settings/image-upload
 * Update image upload settings (partial update)
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env as Env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    // Check authentication (editor+ can modify settings)
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Editor role required to modify settings', 403);
    }

    // Parse body
    let updates: Record<string, any>;
    try {
      updates = await request.json();
    } catch {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body', 400)
      );
      return new Response(body, { status, headers });
    }

    // Validate and sanitize updates
    const validKeys = Object.keys(IMAGE_UPLOAD_DEFAULTS);
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (validKeys.includes(key)) {
        // Type validation
        const defaultValue = IMAGE_UPLOAD_DEFAULTS[key as keyof typeof IMAGE_UPLOAD_DEFAULTS];
        if (typeof value === typeof defaultValue) {
          sanitized[key] = value;
        }
      }
    }

    const newSettings = await updateImageUploadSettings(env.DB, sanitized);

    const { body, status, headers } = formatSuccessResponse({
      success: true,
      data: newSettings,
      message: 'Settings updated',
    });
    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Error updating image upload settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update settings', 500)
    );
    return new Response(body, { status, headers });
  }
};

/**
 * DELETE /api/settings/image-upload
 * Reset image upload settings to defaults
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env as Env;
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

    // Check authentication (admin only can reset)
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Admin role required to reset settings', 403);
    }

    const settings = await resetImageUploadSettings(env.DB);

    const { body, status, headers } = formatSuccessResponse({
      success: true,
      data: settings,
      message: 'Settings reset to defaults',
    });
    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Error resetting image upload settings:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to reset settings', 500)
    );
    return new Response(body, { status, headers });
  }
};
