import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

/**
 * POST /api/upload-thumbnail
 * Upload a template thumbnail to R2 (does NOT save to media table)
 * Uses stable filename based on slug - overwrites existing thumbnail automatically
 * 
 * Form Data:
 * - file: The thumbnail image file
 * - templateSlug: The template slug (used for naming)
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;

        if (!env?.IMAGES) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
        }

        const bucket = env.IMAGES;
        const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

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

        // With stable filenames, uploading to the same key overwrites automatically
        // No need to explicitly delete old thumbnails

        // Use STABLE key: thumbnails/thumb-{slug}.webp (no timestamp!)
        // This allows overwriting on each save
        const stableKey = `thumbnails/thumb-${templateSlug}.webp`;

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Upload directly to R2 with stable key (bypasses uploadImage timestamp logic)
        await bucket.put(stableKey, arrayBuffer, {
            httpMetadata: {
                contentType: file.type || 'image/webp',
            },
            customMetadata: {
                type: 'template-thumbnail',
                templateSlug,
                uploadedAt: new Date().toISOString(),
            },
        });

        // Build the public URL
        const thumbnailUrl = `${publicUrl}/${stableKey}`;

        // Return success - DO NOT save to media table
        const { body, status, headers } = formatSuccessResponse({
            url: thumbnailUrl,
            key: stableKey,
            size: arrayBuffer.byteLength,
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
