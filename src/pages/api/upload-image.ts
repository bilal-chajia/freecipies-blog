import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { uploadImage, createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { calculateAspectRatio, getImageDimensions } from '@shared/utils/imageMeta';
import { getImageUploadSettings } from '@modules/settings';
import { IMAGE_SUPPORTED_TYPES } from '@shared/constants/image-upload';
import { validate, z } from '@shared/validation';

export const POST: APIRoute = async ({ request, locals }) => {
  try {

    // Use proxy endpoint for image URLs (NOT R2 public URL)
    const publicUrl = '/api/images';

    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    // Allow EDITOR or ADMIN
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate text fields with Zod
    const { alt, attribution, caption } = validate(
      z.object({
        alt: z.string().optional(),
        attribution: z.string().optional(),
        caption: z.string().optional(),
      }),
      {
        alt: formData.get('alt') ?? undefined,
        attribution: formData.get('attribution') ?? undefined,
        caption: formData.get('caption') ?? undefined,
      }
    );

    // 1. Load settings (defaults + overrides)
    const settings = await getImageUploadSettings(env.DB);
    const MAX_SIZE_BYTES = settings.maxFileSizeMB * 1024 * 1024;
    const allowedTypes = IMAGE_SUPPORTED_TYPES;

    // 2. Validate file
    if (!file) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB`, 400);
    }
    if (!allowedTypes.includes(file.type as any)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid file type: ${file.type}`, 400);
    }

    // 2. Get real image dimensions (single buffer reused for upload)
    let width = 0;
    let height = 0;
    let arrayBuffer: ArrayBuffer | null = null;
    try {
      arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer) {
        const dimensions = getImageDimensions(new Uint8Array(arrayBuffer));
        width = dimensions.width;
        height = dimensions.height;
      }
    } catch (e) {
      console.warn('Could not extract image dimensions:', e);
    }

    // 3. Upload to R2 (reuse buffer when available to avoid double-read)
    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: file.name,
        contentType: file.type,
        folder: 'media',
        metadata: {
          alt: alt || '',
          credit: attribution || '',
        },
        arrayBuffer: arrayBuffer || undefined,
      },
      publicUrl
    );

    // 4. Store ONLY original variant with real data (no fake variants)
    // Components using this endpoint get single-image storage
    const variants = {
      original: {
        url: result.url,
        r2_key: result.key,
        width,
        height,
        sizeBytes: result.size,
      },
    };

    // 5. Calculate real aspect ratio
    const aspectRatio = width && height ? calculateAspectRatio(width, height) : null;

    // 6. Insert into D1 using Service
    const mediaData: NewMedia = {
      name: file.name,
      altText: alt || '',
      caption: caption || '',
      credit: attribution || '',
      mimeType: result.contentType,
      variantsJson: JSON.stringify({ variants, placeholder: '' }),
      focalPointJson: JSON.stringify({ x: 50, y: 50 }),
      aspectRatio,
    };

    const newMedia = await createMedia(env.DB, mediaData);

    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to save media record', 500);
    }

    const { body, status, headers } = formatSuccessResponse(newMedia);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error('Error uploading image:', error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, error instanceof Error ? error.stack || error.message : String(error), 500)
    );
    return new Response(body, { status, headers });
  }
};
