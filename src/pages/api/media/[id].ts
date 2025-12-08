import type { APIRoute } from 'astro';
import { deleteMedia, getMediaById, updateMedia, type Env } from '../../../lib/db';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../../lib/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '../../../lib/error-handler';

export const prerender = false;

// PUT - Replace image file (in-place)
export const PUT: APIRoute = async ({ request, locals, params }) => {
    const idStr = params.id;
    if (!idStr) {
        return new Response(JSON.stringify({ error: 'Media ID is required' }), { status: 400 });
    }

    const id = parseInt(idStr);
    if (isNaN(id)) {
        return new Response(JSON.stringify({ error: 'Invalid ID format' }), { status: 400 });
    }

    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        // Get the original media record
        const media = await getMediaById(env.DB, id);
        if (!media) {
            return new Response(JSON.stringify({ error: 'Media file not found' }), { status: 404 });
        }

        // Get the new file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
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
        }

        // Upload new file to R2
        const arrayBuffer = await file.arrayBuffer();
        await env.IMAGES.put(newKey, arrayBuffer, {
            httpMetadata: {
                contentType: 'image/webp'
            }
        });

        // Update database record
        await updateMedia(env.DB, id, {
            r2Key: newKey,
            url: newUrl,
            filename: newFilename || file.name,
            mimeType: 'image/webp',
            sizeBytes: file.size
        });

        const { body, status, headers } = formatSuccessResponse({
            success: true,
            id,
            url: newUrl
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Error replacing media:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to replace media', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
    const idStr = params.id;
    if (!idStr) {
        return new Response(JSON.stringify({ error: 'Media ID is required' }), { status: 400 });
    }

    const id = parseInt(idStr);
    if (isNaN(id)) {
        return new Response(JSON.stringify({ error: 'Invalid ID format' }), { status: 400 });
    }

    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        // Get the media file first to find the R2 key
        const media = await getMediaById(env.DB, id);
        if (!media) {
            return new Response(JSON.stringify({ error: 'Media file not found' }), { status: 404 });
        }

        // Delete from R2
        if (media.r2Key) {
            try {
                await env.IMAGES.delete(media.r2Key);
            } catch (r2Error) {
                console.warn(`Failed to delete file from R2 (key: ${media.r2Key}):`, r2Error);
                // Proceed to delete from DB anyway to avoid orphans in DB
            }
        }

        // Delete from DB
        const success = await deleteMedia(env.DB, id);

        if (success) {
            const { body, status, headers } = formatSuccessResponse({ success: true, id });
            return new Response(body, { status, headers });
        } else {
            throw new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to delete media record', 500);
        }

    } catch (error) {
        console.error('Error deleting media:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete media', 500)
        );
        return new Response(body, { status, headers });
    }
};
