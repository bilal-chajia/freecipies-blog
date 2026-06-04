/**
 * Proxy endpoint to fetch external images (bypasses CORS)
 * Returns the image as a blob for client-side processing
 */
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { validateQuery, ProxyImageQuery } from '@shared/validation';

const ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
];

function isPrivateHost(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
    if (host.endsWith('.local')) return true;
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
        const [a, b] = ipv4Match.slice(1).map(Number);
        if (a === 10) return true;
        if (a === 192 && b === 168) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 169 && b === 254) return true;
    }
    return false;
}

export const GET: APIRoute = async ({ request }) => {
    try {

        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

        // Authenticate
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Insufficient permissions', 403);
        }

        // Validate query params with Zod
        const urlObj = new URL(request.url);
        const { url: image_url } = validateQuery(urlObj.searchParams, ProxyImageQuery);

        let parsed: URL;
        try {
            parsed = new URL(image_url);
        } catch {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid URL', 400);
        }

        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only HTTP/HTTPS URLs are allowed', 400);
        }
        if (isPrivateHost(parsed)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'URL host is not allowed', 400);
        }

        // Fetch the image with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(image_url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
            },
        });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, `Failed to fetch image: ${response.status}`, 400);
        }

        const contentType = response.headers.get('content-type')?.split(';')[0].trim() || '';
        if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, `Unsupported content type: ${contentType}`, 400);
        }

        // Stream the image back
        const imageData = await response.arrayBuffer();

        return new Response(imageData, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'no-store',
            },
        });

    } catch (error) {
        console.error('Image proxy error:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch image', 500)
        );
        return new Response(body, { status, headers });
    }
};
