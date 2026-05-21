import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { uploadImage } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getImageUploadSettings } from '@modules/settings';
import { IMAGE_SUPPORTED_TYPES } from '@shared/constants/image-upload';
import { calculateAspectRatio, getImageDimensions } from '@shared/utils/imageMeta';
import { validate } from '@shared/validation';
import { z } from '@shared/validation';

/** Schema for validating the pin image upload form data */
const PinUploadImageForm = z.object({
  file: z.instanceof(File, { message: 'No file uploaded' }),
});

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

    // Use proxy endpoint for image URLs (NOT R2 public URL)
    const publicUrl = '/api/images';

    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const formData = await request.formData();
    const { file } = validate(PinUploadImageForm, { file: formData.get('file') });

    // Settings and validation
    const settings = await getImageUploadSettings(env.DB, { cache: env.SETTINGS_CACHE ?? env.SESSION ?? null });
    const MAX_SIZE_BYTES = settings.max_file_size_mb * 1024 * 1024;
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
