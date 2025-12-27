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

        // Authenticate
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json() as { 
            imageUrl?: string;
            url?: string;
            alt?: string; 
            attribution?: string; 
            caption?: string;
        };
        
        const imageUrl = body.imageUrl || body.url;
        const { alt, attribution, caption } = body;

        if (!imageUrl) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No URL provided', 400);
        }

        // Fetch image
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, `Failed to fetch image from URL: ${response.statusText}`, 400);
        }
        
        const blob = await response.blob();
        
        // Sanitize filename
        const rawFilename = imageUrl.split('/').pop()?.split('?')[0] || `import-${Date.now()}`;
        const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_'); // Basic sanitization

        // Upload to R2
        const result = await uploadImage(
            env.IMAGES,
            {
                file: blob,
                filename: filename,
                contentType: blob.type || 'image/jpeg',
                folder: 'media',
                metadata: {
                    alt: alt || '',
                    credit: attribution || ''
                }
            },
            publicUrl
        );

        // Prepare Variants JSON (Simulation)
        const variants = {
            original: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
            lg: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
            md: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
            sm: { url: result.url, width: 0, height: 0, sizeBytes: result.size },
            xs: { url: result.url, width: 0, height: 0, sizeBytes: result.size }
        };

        // Create DB Record
         const mediaData: NewMedia = {
            name: filename,
            altText: alt || '',
            caption: caption || '',
            credit: attribution || '',
            mimeType: result.contentType,
            variantsJson: JSON.stringify(variants),
            focalPointJson: JSON.stringify({ x: 50, y: 50 }),
            aspectRatio: '1:1'
        };

        const newMedia = await createMedia(env.DB, mediaData);

        if (!newMedia) {
             throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to save media record', 500);
        }

        const { body: responseBody, status, headers } = formatSuccessResponse(newMedia);
        return new Response(responseBody, { status: 201, headers });

    } catch (error) {
        console.error('Error uploading from URL:', error);
         const { body, status, headers } = formatErrorResponse(
            error instanceof AppError 
                ? error 
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Import from URL failed', 500)
        );
        return new Response(body, { status, headers });
    }
};
