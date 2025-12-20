import type { APIRoute } from 'astro';
import { uploadImage, deleteImage } from '@modules/media';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

/**
 * POST /api/upload-thumbnail
 * Upload a template thumbnail to R2 (does NOT save to media table)
 * 
 * Form Data:
 * - file: The thumbnail image file
 * - templateSlug: The template slug (used for naming)
 * - oldThumbnailUrl: (optional) URL of old thumbnail to delete
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;

        if (!env?.IMAGES) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
        }

        const bucket = env.IMAGES;
        const publicUrl = (env as any).ENVIRONMENT === 'production' ? env.R2_PUBLIC_URL : '/images';

        // Authenticate and authorize user
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions to upload thumbnails', 403);
        }

        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const templateSlug = formData.get('templateSlug') as string || 'untitled';
        const oldThumbnailUrl = formData.get('oldThumbnailUrl') as string || '';

        if (!file) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400)
            );
            return new Response(body, { status, headers });
        }

        // Validate file is an image
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.', 400)
            );
            return new Response(body, { status, headers });
        }

        // Delete old thumbnail if provided
        if (oldThumbnailUrl && oldThumbnailUrl.includes('/thumbnails/')) {
            try {
                // Extract key from URL: /images/thumbnails/... -> thumbnails/...
                const urlParts = oldThumbnailUrl.split('/images/');
                if (urlParts.length > 1) {
                    const oldKey = urlParts[1];
                    await deleteImage(bucket, oldKey);
                    console.log(`Deleted old thumbnail: ${oldKey}`);
                }
            } catch (deleteError) {
                // Log but don't fail - old file might not exist
                console.warn('Failed to delete old thumbnail:', deleteError);
            }
        }

        // Upload new thumbnail to R2 (in thumbnails folder)
        const result = await uploadImage(
            bucket,
            {
                file,
                filename: file.name,
                contentType: file.type,
                metadata: {
                    type: 'template-thumbnail',
                    templateSlug,
                },
                folder: 'thumbnails',
                contextSlug: templateSlug
            },
            publicUrl
        );

        // Return success - DO NOT save to media table
        const { body, status, headers } = formatSuccessResponse({
            url: result.url,
            key: result.key,
            size: result.size,
        });
        return new Response(body, { status, headers });

    } catch (error: any) {
        console.error('Error uploading thumbnail:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, error.message || 'Failed to upload thumbnail', 500)
        );
        return new Response(body, { status, headers });
    }
};
