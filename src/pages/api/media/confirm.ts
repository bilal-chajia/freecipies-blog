/**
 * Media Confirm API - Finalize media record after all variants uploaded to R2
 * ============================================================================
 * 
 * POST /api/media/confirm
 *   Body:
 *     {
 *       uploadId: string,
 *       baseName: string,
 *       name: string,
 *       altText: string,
 *       caption?: string,
 *       credit?: string,
 *       aspectRatio?: string,
 *       focalPoint?: { x: number, y: number },
 *       mimeType: string,
 *       variants: {
 *         original?: { r2Key: string, width: number, height: number, sizeBytes?: number },
 *         lg: { r2Key: string, width: number, height: number, sizeBytes?: number },
 *         md: { r2Key: string, width: number, height: number, sizeBytes?: number },
 *         sm: { r2Key: string, width: number, height: number, sizeBytes?: number },
 *         xs: { r2Key: string, width: number, height: number, sizeBytes?: number }
 *       },
 *       placeholder: string // base64 LQIP
 *     }
 * 
 *   Returns: Complete media record
 */

import type { APIRoute } from 'astro';
import { createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

interface VariantInfo {
  r2Key: string;
  width: number;
  height: number;
  sizeBytes?: number;
}

interface ConfirmBody {
  uploadId: string;
  baseName: string;
  name: string;
  altText: string;
  caption?: string;
  credit?: string;
  aspectRatio?: string;
  focalPoint?: { x: number; y: number };
  mimeType: string;
  variants: {
    original?: VariantInfo;
    lg: VariantInfo;
    md: VariantInfo;
    sm: VariantInfo;
    xs: VariantInfo;
  };
  placeholder: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    // Authenticate
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    // Parse body
    const body = await request.json() as ConfirmBody;

    // Validate required fields
    if (!body.name || !body.altText || !body.variants) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: name, altText, variants', 400);
    }

    // Validate all required variants are present
    const requiredVariants = ['lg', 'md', 'sm', 'xs'];
    for (const v of requiredVariants) {
      if (!body.variants[v as keyof typeof body.variants]) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, `Missing required variant: ${v}`, 400);
      }
    }

    // Build public URL from R2 key
    const publicUrl = (env as any).ENVIRONMENT === 'production' 
      ? env.R2_PUBLIC_URL 
      : '/images';

    // Build variants JSON for storage
    const variantsJson = {
      variants: {} as Record<string, { url: string; r2_key: string; width: number; height: number; sizeBytes?: number }>,
      placeholder: body.placeholder || '',
    };

    // Add each variant
    for (const [key, variant] of Object.entries(body.variants)) {
      if (variant) {
        variantsJson.variants[key] = {
          url: `${publicUrl}/${variant.r2Key}`,
          r2_key: variant.r2Key,
          width: variant.width,
          height: variant.height,
          sizeBytes: variant.sizeBytes,
        };
      }
    }

    // Build focal point JSON
    const focalPointJson = body.focalPoint 
      ? JSON.stringify(body.focalPoint) 
      : '{"x": 50, "y": 50}';

    // Create media record
    const mediaData: NewMedia = {
      name: body.name,
      altText: body.altText,
      caption: body.caption || '',
      credit: body.credit || '',
      mimeType: body.mimeType || 'image/webp',
      aspectRatio: body.aspectRatio || null,
      variantsJson: JSON.stringify(variantsJson),
      focalPointJson,
    };

    const newMedia = await createMedia(env.DB, mediaData);

    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to create media record', 500);
    }

    const { body: responseBody, status, headers } = formatSuccessResponse(newMedia);
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
