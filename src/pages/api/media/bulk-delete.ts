import type { APIRoute } from 'astro';
import { hardDeleteMedia, getMediaById } from '@modules/media';
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

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Editor role required to delete media files', 403);
        }

        // Parse IDs from body
        let ids: number[] = [];
        try {
            const body = await request.json() as any;
            if (Array.isArray(body.ids)) {
                ids = body.ids.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
            }
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
        }

        if (ids.length === 0) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'No valid IDs provided', 400)
            );
            return new Response(body, { status, headers });
        }

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

                    // 2. Delete all R2 files
                    const r2Keys = getAllR2Keys(mediaRecord.variantsJson);
                    await Promise.all(r2Keys.map(key => env.IMAGES.delete(key).catch(e => console.warn(`R2 delete failed for ${key}`, e))));

                    // 3. Delete from DB (hard delete)
                    const success = await hardDeleteMedia(env.DB, id);
                    if (success) {
                        stats.deleted++;
                    } else {
                        stats.failed++;
                        stats.errors.push(`Failed to delete media ${id} from DB`);
                    }
                } catch (err: any) {
                    console.error(`Error deleting media ${id}:`, err);
                    stats.failed++;
                    stats.errors.push(`Error deleting ${id}: ${err.message}`);
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
