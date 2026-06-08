import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { deleteMedia, getMediaById, hardDeleteMedia } from '@modules/media';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateBody, BulkDeleteSchema } from '@shared/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
    try {

        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const isHardDelete = url.searchParams.get('hard') === 'true';

        // Check authentication — hard-delete requires ADMIN role
        const authContext = await extractAuthContext(request, jwtSecret);
        if (isHardDelete && !hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Admin role required for hard delete (permanent R2 cleanup)', 403);
        }
        if (!isHardDelete && !hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to delete media files', 403);
        }

        // Validate IDs from body via Zod
        const { ids } = await validateBody(request, BulkDeleteSchema);

        const stats = {
            processed: 0,
            deleted: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Process deletions in parallel batches to avoid timeout
        const BATCH_SIZE = 5;
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (id) => {
                try {
                    // 1. Get media info
                    const mediaRecord = await getMediaById(env.DB, id);
                    if (!mediaRecord) {
                        stats.failed++;
                        stats.errors.push(`Media ${id} not found`);
                        return;
                    }

                    // Hard delete: clean R2 objects + remove DB record permanently
                    // Soft delete: mark deleted_at only (default)
                    let success: boolean;
                    if (isHardDelete) {
                        success = await hardDeleteMedia(env.DB, env.IMAGES, id);
                    } else {
                        success = await deleteMedia(env.DB, id);
                    }
                    if (success) {
                        stats.deleted++;
                    } else {
                        stats.failed++;
                        stats.errors.push(`Failed to delete media ${id} from DB`);
                    }
                } catch (err: unknown) {
                    console.error(`Error deleting media ${id}:`, err);
                    stats.failed++;
                    const message = err instanceof Error ? err.message : String(err);
                    stats.errors.push(`Error deleting ${id}: ${message}`);
                } finally {
                    stats.processed++;
                }
            }));
        }

        const { body, status, headers } = formatSuccessResponse({
            success: true,
            stats
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Bulk delete error:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Bulk delete failed', 500)
        );
        return new Response(body, { status, headers });
    }
};
