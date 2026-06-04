import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { deleteMedia, getMediaById, updateMedia, propagateMediaUpdate } from '@modules/media';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateParams, validateBody, IdParam, UpdateMediaSchema } from '@shared/validation';
import { normalizeStoredAuthorCreditSnapshot, serializeAdminMediaPayload } from '@shared/images/image-contract';

export const prerender = false;

// PATCH - Update media metadata (alt, caption, credit, focal point, etc.)
// Propagates changes to all referencing image snapshots.
export const PATCH: APIRoute = async ({ request, params }) => {
    const { id } = validateParams(params as Record<string, string | undefined>, IdParam);

    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to update media metadata', 403);
        }

        // Verify media exists
        const existing = await getMediaById(env.DB, id);
        if (!existing) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
            );
            return new Response(body, { status, headers });
        }

        // Parse & validate body
        const body = await validateBody(request, UpdateMediaSchema);

        // Build update payload — snake_case end to end (body, Drizzle, column).
        const updatePayload: Record<string, unknown> = {};
        if (body.name !== undefined) updatePayload.name = body.name;
        if (body.alt_text !== undefined) updatePayload.alt_text = body.alt_text;
        if (body.caption !== undefined) updatePayload.caption = body.caption;
        if (body.aspect_ratio !== undefined) updatePayload.aspect_ratio = body.aspect_ratio;

        if (body.credit !== undefined) {
            const normalized = normalizeStoredAuthorCreditSnapshot(body.credit);
            updatePayload.credit = JSON.stringify(normalized);
        }

        if (body.focal_point !== undefined) {
            updatePayload.focal_point_json = JSON.stringify(body.focal_point);
        }

        if (Object.keys(updatePayload).length === 0) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'No fields to update', 400)
            );
            return new Response(errBody, { status, headers });
        }

        // 1. Update the media row
        await updateMedia(env.DB, id, updatePayload as Parameters<typeof updateMedia>[2]);

        // 2. Propagate changes to all referencing snapshots (best-effort)
        let syncResult;
        try {
            syncResult = await propagateMediaUpdate(env.DB, id);
        } catch (syncError) {
            console.error(`Snapshot sync failed for media ${id}:`, syncError);
            syncResult = { errors: ['Snapshot sync failed — snapshots may be stale'] };
        }

        // 3. Return fresh media payload
        const updated = await getMediaById(env.DB, id);
        const { body: responseBody, status, headers } = formatSuccessResponse({
            ...serializeAdminMediaPayload(updated!),
            snapshotSync: syncResult,
        });
        return new Response(responseBody, { status, headers });

    } catch (error) {
        console.error('Error updating media:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to update media', 500)
        );
        return new Response(body, { status, headers });
    }
};

// PUT - Replace image file (in-place)
// NOTE: In-place replacement is disabled — callers must re-upload via the variant pipeline.
export const PUT: APIRoute = async ({ request, params }) => {
    const { id } = validateParams(params as Record<string, string | undefined>, IdParam);

    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to replace media files', 403);
        }

        const { body, status, headers } = formatErrorResponse(
            new AppError(
                ErrorCodes.VALIDATION_ERROR,
                'In-place media replacement is disabled. Delete the existing record and re-upload via /api/media/upload-variant + /api/media/confirm.',
                410
            )
        );
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Error replacing media:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to replace media', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, params }) => {
    const { id } = validateParams(params as Record<string, string | undefined>, IdParam);

    try {

        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to delete media files', 403);
        }

        const mediaRecord = await getMediaById(env.DB, id);
        if (!mediaRecord) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.NOT_FOUND, `Media file with ID ${id} not found`, 404)
            );
            return new Response(body, { status, headers });
        }

        try {
            const success = await deleteMedia(env.DB, id);
            if (!success) {
                const { body, status, headers } = formatErrorResponse(
                    new AppError(ErrorCodes.DATABASE_ERROR, `Failed to soft-delete media record with ID ${id}`, 500)
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
            storageCleanup: 'pending'
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
