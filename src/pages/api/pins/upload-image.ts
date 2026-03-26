import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { uploadImage } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getImageUploadSettings } from '@modules/settings';
import { IMAGE_SUPPORTED_TYPES } from '@shared/constants/image-upload';
import { calculateAspectRatio, getImageDimensions } from '@shared/utils/imageMeta';

/**
 * PinCreator upload endpoint
 * - No DB record
 * - No variants: returns a single URL for pinterest_pins.image_url
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {

    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
    }

    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    // Settings and validation
    const settings = await getImageUploadSettings(env.DB);
    const MAX_SIZE_BYTES = settings.maxFileSizeMB * 1024 * 1024;
    const allowedTypes = IMAGE_SUPPORTED_TYPES;

    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB`, 400);
    }
    if (!allowedTypes.includes(file.type as any)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid file type: ${file.type}`, 400);
    }

    // Buffer once for dimensions + upload
    const arrayBuffer = await file.arrayBuffer();
    const dimensions = getImageDimensions(new Uint8Array(arrayBuffer));

    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: file.name,
        contentType: file.type || 'image/jpeg',
        folder: 'pins',
        arrayBuffer,
      },
      publicUrl
    );

    const { body, status, headers } = formatSuccessResponse({
      url: result.url,
      key: result.key,
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: result.size,
      aspectRatio: dimensions.width && dimensions.height
        ? calculateAspectRatio(dimensions.width, dimensions.height)
        : null,
    });

    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error uploading pin image:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload pin image', 500)
    );
    return new Response(body, { status, headers });
  }
};
