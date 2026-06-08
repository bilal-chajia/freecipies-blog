import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuthors, createAuthor, transformAuthorRequestBody, transformAuthorResponse } from '@modules/authors';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { validateBody, CreateAuthorSchema } from '@shared/validation';

export const prerender = false;

/**
 * GET /api/authors - Get all authors
 */
export const GET: APIRoute = async ({ url }) => {
    try {
        if (!env?.DB) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
        }

        // Optional filter by workflow status
        const workflowStatusParam = url.searchParams.get('workflow_status');
        const options = workflowStatusParam !== null
            ? { workflow_status: workflowStatusParam as 'draft' | 'published' | 'archived' }
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
export const POST: APIRoute = async ({ request }) => {
    try {
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Auth check
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const body = await validateBody(request, CreateAuthorSchema);
        const transformedBody = transformAuthorRequestBody(body);

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
