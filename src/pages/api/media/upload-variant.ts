/**
 * Media Upload Variant API - Upload a single variant via Worker (fallback mode)
 * ==============================================================================
 * 
 * Used when presigned URLs aren't available (no R2 API credentials).
 * 
 * POST /api/media/upload-variant
 *   FormData:
 *     - file: Blob
 *     - variant_name: string (original, lg, md, sm, xs)
 *     - base_name: string
 *     - upload_id: string (for grouping variants)
 * 
 *   Returns: { upload_key, url, width, height, size_bytes }
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { uploadImage } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getImageUploadSettings } from '@modules/settings';
import { IMAGE_SUPPORTED_TYPES } from '@shared/constants/image-upload';
import { validate, VariantUploadFields } from '@shared/validation';
import { buildMediaImageR2Key, normalizeImageAssetId, normalizeImageExtension } from '@shared/images/r2-naming';

export const POST: APIRoute = async ({ request }) => {
  try {


    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
    }

    // Authenticate
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    // Use proxy endpoint for image URLs (NOT R2 public URL)
    const publicUrl = '/api/images';

    // Load upload settings
    const settings = await getImageUploadSettings(env.DB, { cache: env.SETTINGS_CACHE ?? env.SESSION ?? null });
    const MAX_SIZE_BYTES = settings.max_file_size_mb * 1024 * 1024;
    const allowedTypes = IMAGE_SUPPORTED_TYPES;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate variant fields via Zod
    const { variant_name: variantName, base_name: baseName, upload_id: uploadId, width, height } = validate(VariantUploadFields, {
      variant_name: formData.get('variant_name'),
      base_name: formData.get('base_name'),
      upload_id: formData.get('upload_id') || undefined,
      width: formData.get('width') || '0',
      height: formData.get('height') || '0',
    });

    if (!file || !variantName || !baseName) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: file, variantName, baseName', 400);
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB`,
        400
      );
    }
    if (!allowedTypes.includes(file.type as any)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid file type: ${file.type}`, 400);
    }

    const ext = normalizeImageExtension(file.name.split('.').pop());
    const assetId = normalizeImageAssetId(uploadId);
    const r2Key = buildMediaImageR2Key({
      slugBase: baseName,
      variant: variantName,
      assetId,
      extension: ext,
    });

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();

    await uploadImage(
      env.IMAGES,
      {
        file,
        filename: `${baseName}-${variantName}.${ext}`,
        contentType: file.type || 'image/webp',
        key: r2Key,
        arrayBuffer,
      },
      publicUrl
    );

    const { body, status, headers } = formatSuccessResponse({
      upload_key: r2Key,
      url: `${publicUrl}/${r2Key}`,
      width,
      height,
      size_bytes: arrayBuffer.byteLength,
    });

    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Error uploading variant:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Variant upload failed', 500)
    );
    return new Response(body, { status, headers });
  }
};
