import type { APIRoute } from 'astro';
import { deleteMedia, hardDeleteMedia, getMediaById, updateMedia } from '@modules/media';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

// Helper to extract all R2 keys from variants JSON
function getAllR2Keys(variantsJson: string | null): string[] {
    if (!variantsJson) return [];
    const keys: string[] = [];
    try {
        const data = JSON.parse(variantsJson);
        
        // Handle new structure: { variants: { lg: { r2_key: ... }, ... } }
        if (data.variants && typeof data.variants === 'object') {
            Object.values(data.variants).forEach((variant: any) => {
                if (variant?.r2_key) {
                    keys.push(variant.r2_key);
                }
            });
        } 
        // Handle potential legacy flat structure or other formats
        else {
             // Try to find R2 key in simple object
            const simpleVariant = data.original || data.lg || data.md || data.sm || data.xs;
            if (simpleVariant?.r2_key) keys.push(simpleVariant.r2_key);
        }
    } catch {
        // Ignore parsing errors
    }
    return keys;
}

// ... (PUT implementation skipped for brevity as we focus on DELETE, but helper is shared)
// Actually I need to keep PUT, so I will just replace the helper and the DELETE function.

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
        const mediaRecord = await getMediaById(env.DB, id);
        if (!mediaRecord) {
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

        // Clean up ALL old files from R2
        const oldKeys = getAllR2Keys(mediaRecord.variantsJson);
        for (const key of oldKeys) {
            try {
                await env.IMAGES.delete(key);
            } catch (e) {
                console.warn(`Failed to delete old variant ${key}:`, e);
            }
        }

        // Generate new key (note: PUT currently only does single file upload, not full variant generation pipeline)
        // Ideally PUT should also go through the client-side flow, but for now we keep existing simple logic
        const timestamp = Date.now();
        const newKey = `media/${id}/${timestamp}.webp`;
        const cacheBuster = `?v=${timestamp}`;
        const newUrl = `${env.R2_PUBLIC_URL}/${newKey}${cacheBuster}`;

        try {
            const arrayBuffer = await file.arrayBuffer();
            await env.IMAGES.put(newKey, arrayBuffer, {
                httpMetadata: { contentType: 'image/webp' }
            });
        } catch (uploadError) {
            console.error('R2 upload failed:', uploadError);
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file to storage', 500)
            );
            return new Response(body, { status, headers });
        }

        // Update database
        try {
            // Updated to match new structure even for single file
            const newVariants = {
                variants: {
                    original: { url: newUrl.split('?')[0], r2_key: newKey, width: 0, height: 0 }
                },
                placeholder: ''
            };
            await updateMedia(env.DB, id, {
                variantsJson: JSON.stringify(newVariants),
                name: file.name
            });
        } catch (dbError) {
             // ... error handling
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.DATABASE_ERROR, 'Database update failed', 500)
            );
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatSuccessResponse({ success: true, id, url: newUrl });
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

        // Get the media file first to find R2 keys
        const mediaRecord = await getMediaById(env.DB, id);
        if (!mediaRecord) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
            );
            return new Response(body, { status, headers });
        }

        // Delete ALL variants from R2
        let r2DeleteFailed = false;
        const r2Keys = getAllR2Keys(mediaRecord.variantsJson);
        
        // Execute deletions in parallel for speed
        await Promise.all(r2Keys.map(async (key) => {
            try {
                await env.IMAGES.delete(key);
            } catch (r2Error) {
                r2DeleteFailed = true;
                console.warn(`Failed to delete file from R2 (key: ${key}):`, r2Error);
            }
        }));

        // Delete from DB (hard delete - removes the row)
        try {
            const success = await hardDeleteMedia(env.DB, id);
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
            warning: r2DeleteFailed ? 'Some files could not be deleted from storage' : undefined
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
