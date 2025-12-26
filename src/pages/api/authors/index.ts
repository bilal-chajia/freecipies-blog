import type { APIRoute } from 'astro';
import { getAuthors, createAuthor, transformAuthorRequestBody, transformAuthorResponse } from '@modules/authors';
import type { Env } from '@shared/types';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

export const prerender = false;

/**
 * GET /api/authors - Get all authors
 */
export const GET: APIRoute = async ({ url, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Optional filter by isOnline status
        const isOnlineParam = url.searchParams.get('isOnline');
        const options = isOnlineParam !== null
            ? { isOnline: isOnlineParam === 'true' }
            : undefined;

        const authors = await getAuthors(env.DB, options);
        const responseAuthors = authors.map(transformAuthorResponse);

        const { body, status, headers } = formatSuccessResponse(responseAuthors, {
            cacheControl: 'no-cache, no-store, must-revalidate'
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error fetching authors:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch authors', 500)
        );
        return new Response(body, { status, headers });
    }
};

/**
 * POST /api/authors - Create new author
 */
export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await request.json();
        const transformedBody = transformAuthorRequestBody(body);

        // Validate required fields
        if (!body.name || !body.slug || !body.email) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: name, slug, email', 400)
            );
            return new Response(errBody, { status, headers });
        }

        const author = await createAuthor(env.DB, transformedBody);
        const responseAuthor = transformAuthorResponse(author);

        if (!author) {
            const { body: errBody, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create author', 500)
            );
            return new Response(errBody, { status, headers });
        }

        const { body: respBody, headers } = formatSuccessResponse(responseAuthor);
        return new Response(respBody, { status: 201, headers });
    } catch (error) {
        console.error('Error creating author:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to create author', 500)
        );
        return new Response(body, { status, headers });
    }
};
