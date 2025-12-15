import type { APIRoute } from 'astro';
import { deleteMedia, getMediaById, updateMedia, type Env } from '../../../lib/db';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../../lib/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '../../../lib/error-handler';

export const prerender = false;

// PUT - Replace image file (in-place)
export const PUT: APIRoute = async ({ request, locals, params }) => {
    const idStr = params.id;
    if (!idStr) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Media ID is required in URL path', 400)
        );
        return new Response(body, { status, headers });
    }

    const id = parseInt(idStr);
    if (isNaN(id)) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid media ID format: '${idStr}' must be a number`, 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to replace media files', 403);
        }

        // Get the original media record
        const media = await getMediaById(env.DB, id);
        if (!media) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
            );
            return new Response(body, { status, headers });
        }

        // Get the new file from form data
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch (parseError) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid form data: request body must be multipart/form-data', 400)
            );
            return new Response(body, { status, headers });
        }

        const file = formData.get('file') as File;
        if (!file) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided: include a "file" field in form data', 400)
            );
            return new Response(body, { status, headers });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid file type: '${file.type}'. Only image files are allowed`, 400)
            );
            return new Response(body, { status, headers });
        }

        // Determine new path (change extension to .webp if needed)
        const oldKey = media.r2Key;
        const newKey = oldKey.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
        // Add cache-busting timestamp to URL to prevent browser caching
        const cacheBuster = `?v=${Date.now()}`;
        const baseNewUrl = media.url.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp').split('?')[0]; // Remove any existing query params
        const newUrl = baseNewUrl + cacheBuster;
        const newFilename = (media.filename || '').replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');

        // Always delete old file first to ensure clean replacement
        try {
            await env.IMAGES.delete(oldKey);
            // Also delete webp version if original was different format
            if (newKey !== oldKey) {
                // In case there's already a .webp version from previous edit
                try {
                    await env.IMAGES.delete(newKey);
                } catch (e) {
                    // Ignore if doesn't exist
                }
            }
        } catch (r2Error) {
            console.warn(`Failed to delete old file from R2 (key: ${oldKey}):`, r2Error);
            // Continue - not critical if old file deletion fails
        }

        // Upload new file to R2
        try {
            const arrayBuffer = await file.arrayBuffer();
            await env.IMAGES.put(newKey, arrayBuffer, {
                httpMetadata: {
                    contentType: 'image/webp'
                }
            });
        } catch (uploadError) {
            console.error('R2 upload failed:', uploadError);
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file to storage. Please try again.', 500)
            );
            return new Response(body, { status, headers });
        }

        // Update database record
        try {
            await updateMedia(env.DB, id, {
                r2Key: newKey,
                url: newUrl,
                filename: newFilename || file.name,
                mimeType: 'image/webp',
                sizeBytes: file.size
            });
        } catch (dbError) {
            console.error('Database update failed:', dbError);
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.DATABASE_ERROR, 'File uploaded but database update failed. Please contact support.', 500)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({
            success: true,
            id,
            url: newUrl
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Error replacing media:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, `Failed to replace media: ${errorMessage}`, 500)
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
    const idStr = params.id;
    if (!idStr) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Media ID is required in URL path', 400)
        );
        return new Response(body, { status, headers });
    }

    const id = parseInt(idStr);
    if (isNaN(id)) {
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid media ID format: '${idStr}' must be a number`, 400)
        );
        return new Response(body, { status, headers });
    }

    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to delete media files', 403);
        }

        // Get the media file first to find the R2 key
        const media = await getMediaById(env.DB, id);
        if (!media) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
            );
            return new Response(body, { status, headers });
        }

        // Delete from R2
        let r2DeleteFailed = false;
        if (media.r2Key) {
            try {
                await env.IMAGES.delete(media.r2Key);
            } catch (r2Error) {
                r2DeleteFailed = true;
                console.warn(`Failed to delete file from R2 (key: ${media.r2Key}):`, r2Error);
                // Proceed to delete from DB anyway to avoid orphans in DB
            }
        }

        // Delete from DB
        try {
            const success = await deleteMedia(env.DB, id);
            if (!success) {
                const { body, status, headers } = formatErrorResponse(
                    new AppError(ErrorCodes.DATABASE_ERROR, `Failed to delete media record with ID ${id} from database`, 500)
                );
                return new Response(body, { status, headers });
            }
        } catch (dbError) {
            console.error('Database delete failed:', dbError);
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.DATABASE_ERROR, `Database error while deleting media ID ${id}`, 500)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({
            success: true,
            id,
            warning: r2DeleteFailed ? 'File deleted from database but storage cleanup may be incomplete' : undefined
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Error deleting media:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, `Failed to delete media: ${errorMessage}`, 500)
        );
        return new Response(body, { status, headers });
    }
};
