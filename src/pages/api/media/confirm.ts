/**
 * Media Confirm API - Finalize media record after all variants uploaded to R2
 * ============================================================================
 * 
 * POST /api/media/confirm
 *   Body:
 *     {
 *       upload_id: string,
 *       base_name: string,
 *       name: string,
 *       alt_text: string,
 *       caption: string,
 *       credit: {
 *         type: "author",
 *         id: number,
 *         name: string,
 *         slug: string,
 *         avatar?: { variants: { xs: { r2_key: string, width: number, height: number }, sm: { r2_key: string, width: number, height: number } } }
 *       },
 *       aspect_ratio?: string,
 *       focal_point?: { x: number, y: number },
 *       mime_type: string,
 *       variants: {
 *         original: { r2_key: string, width: number, height: number, size_bytes?: number },
 *         lg: { r2_key: string, width: number, height: number, size_bytes?: number },
 *         md: { r2_key: string, width: number, height: number, size_bytes?: number },
 *         sm: { r2_key: string, width: number, height: number, size_bytes?: number },
 *         xs: { r2_key: string, width: number, height: number, size_bytes?: number }
 *       },
 *       placeholder: string // base64 LQIP
 *     }
 * 
 *   Returns: Admin media payload with public URLs
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { validateBody, ConfirmUploadSchema } from '@shared/validation';
import {
  IMAGE_VARIANT_KEYS,
  normalizeMediaVariantsJson,
  normalizeStoredAuthorCreditSnapshot,
  serializeAdminMediaPayload,
} from '@shared/images/image-contract';

async function assertUploadedVariantsExist(variantsJson: ReturnType<typeof normalizeMediaVariantsJson>) {
  if (!env?.IMAGES) {
    throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
  }

  const missingKeys = (
    await Promise.all(
      IMAGE_VARIANT_KEYS.map(async (variantKey) => {
        const r2Key = variantsJson.variants[variantKey].r2_key;
        const object = await env.IMAGES.head(r2Key);
        return object ? null : r2Key;
      })
    )
  ).filter((r): r is string => r !== null);

  if (missingKeys.length) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `Upload incomplete. Missing R2 object(s): ${missingKeys.join(', ')}`,
      400
    );
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {


    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    // Authenticate
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    // Parse & validate body via Zod
    const body = await validateBody(request, ConfirmUploadSchema);

    const variantsJson = normalizeMediaVariantsJson({
      variants: body.variants,
      placeholder: body.placeholder,
    });
    await assertUploadedVariantsExist(variantsJson);

    // Build focal point JSON
    const focal_point_value = body.focal_point
      ? JSON.stringify(body.focal_point)
      : '{"x": 50, "y": 50}';

    const credit = JSON.stringify(normalizeStoredAuthorCreditSnapshot(body.credit));

    // Create media record
    const mediaData: NewMedia = {
      name: body.name,
      alt_text: body.alt_text,
      caption: body.caption,
      credit,
      mime_type: body.mime_type || 'image/webp',
      aspect_ratio: body.aspect_ratio ?? null,
      variants_json: JSON.stringify(variantsJson),
      focal_point_json: focal_point_value,
    };

    const newMedia = await createMedia(env.DB, mediaData);

    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create media record', 500);
    }

    const { body: responseBody, status, headers } = formatSuccessResponse(serializeAdminMediaPayload(newMedia));
    return new Response(responseBody, { status: 201, headers });

  } catch (error) {
    console.error('Error confirming upload:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to confirm upload', 500)
    );
    return new Response(body, { status, headers });
  }
};
