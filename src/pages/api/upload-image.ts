import type { APIRoute } from 'astro';
import { uploadImage, createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.IMAGES) {
        throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
    }

    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

    // Authenticate (Optional? Usually yes for upload)
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    // Allow EDITOR or ADMIN
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
         return createAuthError('Insufficient permissions', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string;
    const attribution = formData.get('attribution') as string;
    const caption = formData.get('caption') as string;

    if (!file) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    // 1. Upload to R2
    const result = await uploadImage(
      env.IMAGES, 
      {
        file,
        filename: file.name,
        contentType: file.type,
        folder: 'media',
        metadata: {
            alt: alt || '',
            credit: attribution || ''
        }
      },
      publicUrl
    );

    // 2. Prepare Variants JSON (Simulation until we have image processing)
    // The schema requires this structure.
    const variants = {
      original: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      lg: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      md: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      sm: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
      xs: { url: result.url, width: 0, height: 0, sizeBytes: result.size }
    };

    // 3. Insert into D1 using Service
    const mediaData: NewMedia = {
        name: file.name,
        altText: alt || '',
        caption: caption || '',
        credit: attribution || '',
        mimeType: result.contentType,
        variantsJson: JSON.stringify(variants),
        focalPointJson: JSON.stringify({ x: 50, y: 50 }),
        aspectRatio: '1:1' // Placeholder
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
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Upload failed', 500)
    );
    return new Response(body, { status, headers });
  }
};
