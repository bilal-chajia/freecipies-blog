import type { APIRoute } from 'astro';
import { getMedia } from '@modules/media';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatSuccessResponse, formatErrorResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals, url }) => {
    try {
        const env = locals.runtime.env as Env;
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

        const mediaFiles = await getMedia(env.DB, {
            type,
            search,
            sortBy,
            order,
            limit,
            offset
        });

        const { body, status, headers } = formatSuccessResponse(mediaFiles);
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Error fetching media:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch media', 500)
        );
        return new Response(body, { status, headers });
    }
};
