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
import { uploadImage } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
    }

    // Authenticate
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

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

    // Build key path
    const suffix = variantName === 'original' ? '' : `-${variantName}`;
    const ext = file.name.split('.').pop() || 'webp';
    const folder = 'media';
    const r2Key = `${folder}/${baseName}${suffix}-${uploadId || Date.now()}.${ext}`;

    // Upload to R2
    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: `${baseName}${suffix}.${ext}`,
        contentType: file.type,
        folder,
      },
      publicUrl
    );

    const { body, status, headers } = formatSuccessResponse({
      r2Key: result.key,
      url: result.url,
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
