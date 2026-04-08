/**
 * Media Upload Variant API - Upload a single variant via Worker (fallback mode)
 * ==============================================================================
 * 
 * Used when presigned URLs aren't available (no R2 API credentials).
 * 
 * POST /api/media/upload-variant
 *   FormData:
 *     - file: Blob
 *     - variantName: string (original, lg, md, sm, xs)
 *     - baseName: string
 *     - uploadId: string (for grouping variants)
 * 
 *   Returns: { r2Key, url, width, height }
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { uploadImage } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getImageUploadSettings } from '@modules/settings';
import { IMAGE_SUPPORTED_TYPES } from '@shared/constants/image-upload';

export const POST: APIRoute = async ({ request, locals }) => {
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
    const settings = await getImageUploadSettings(env.DB);
    const MAX_SIZE_BYTES = settings.maxFileSizeMB * 1024 * 1024;
    const allowedTypes = IMAGE_SUPPORTED_TYPES;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const variantName = formData.get('variantName') as string;
    const baseName = formData.get('baseName') as string;
    const uploadId = formData.get('uploadId') as string;
    const width = parseInt(formData.get('width') as string) || 0;
    const height = parseInt(formData.get('height') as string) || 0;

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

    // Build key path
    const suffix = variantName === 'original' ? '' : `-${variantName}`;
    const ext = file.name.split('.').pop() || 'webp';
    const folder = 'media';
    const r2Key = `${folder}/${baseName}${suffix}-${uploadId || Date.now()}.${ext}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();

    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: `${baseName}${suffix}.${ext}`,
        contentType: file.type || 'image/webp',
        folder,
        key: r2Key,
        arrayBuffer,
      },
      publicUrl
    );

    const { body, status, headers } = formatSuccessResponse({
      r2Key: r2Key,
      url: `${publicUrl}/${r2Key}`,
      width,
      height,
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
