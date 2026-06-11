import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getMedia, countMedia } from '@modules/media';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';
import { validateQuery, MediaListQuery } from '@shared/validation';
import { serializeAdminMediaPayload } from '@shared/images/image-contract';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
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
        const dateFrom = url.searchParams.get('dateFrom') || undefined;
        const dateTo = url.searchParams.get('dateTo') || undefined;

        // Validate limit/offset via Zod
        const { limit, offset, page } = validateQuery(url.searchParams, MediaListQuery);

        const [mediaFiles, totalCount] = await Promise.all([
            getMedia(env.DB, {
                type,
                search,
                sortBy,
                order,
                limit,
                offset,
                dateFrom,
                dateTo
            }),
            countMedia(env.DB, {
                type,
                search,
                dateFrom,
                dateTo
            })
        ]);

        const enhancedMediaFiles = mediaFiles.map(serializeAdminMediaPayload);

        const pagination = {
            total: totalCount,
            page,
            limit,
            total_pages: Math.ceil(totalCount / limit),
            has_more: offset + mediaFiles.length < totalCount
        };

        const { body, status, headers } = formatSuccessResponse({
            data: enhancedMediaFiles,
            pagination
        });
        return new Response(body, { status, headers });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching media:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.DATABASE_ERROR, `Failed to fetch media: ${message}`, 500)
        );
        return new Response(body, { status, headers });
    }
};
