import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getMedia } from '@modules/media';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';
import { resolveVariantUrl } from '@shared/types/images';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals, url }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Check authentication
        const authContext = await extractAuthContext(request, jwtSecret);

        if (!authContext.isAuthenticated) {
            return createAuthError('Unauthorized', 401);
        }

        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        // Parse query params
        const type = url.searchParams.get('type') || undefined;
        const search = url.searchParams.get('search') || undefined;
        const sortBy = url.searchParams.get('sortBy') || undefined;
        const order = (url.searchParams.get('order') as 'asc' | 'desc') || 'desc';
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const dateFrom = url.searchParams.get('dateFrom') || undefined;
        const dateTo = url.searchParams.get('dateTo') || undefined;


        const mediaFiles = await getMedia(env.DB, {
            type,
            search,
            sortBy,
            order,
            limit,
            offset,
            dateFrom,
            dateTo
        });

        // Transform media files to include 'url' property for frontend compatibility
        const enhancedMediaFiles = mediaFiles.map((file: any) => {
            let url = file.url || '';
            
            if (!url && file.variantsJson) {
                try {
                    const parsed = typeof file.variantsJson === 'string' 
                        ? JSON.parse(file.variantsJson) 
                        : file.variantsJson;
                    
                    const variants = parsed.variants || parsed;

                    url = resolveVariantUrl(variants.original) ||
                          resolveVariantUrl(variants.lg) ||
                          resolveVariantUrl(variants.md) ||
                          resolveVariantUrl(variants.sm) ||
                          resolveVariantUrl(variants.public) ||
                          '';

                } catch (e) {
                    console.warn(`Failed to parse variantsJson for media ${file.id}`);
                }
            }
            
            return {
                ...file,
                url
            };
        });

        const { body, status, headers } = formatSuccessResponse(enhancedMediaFiles);
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Error fetching media:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch media', 500)
        );
        return new Response(body, { status, headers });
    }
};
