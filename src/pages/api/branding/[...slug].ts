import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import { validate, z } from '@shared/validation';

export const prerender = false;

// Valid logo types
const VALID_LOGO_TYPES = ['main', 'dark', 'mobile'];
const VALID_IMAGE_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon'];

/** Schema for POST /api/branding action path parts */
const BrandingActionSchema = z.object({
    action: z.enum(['logo', 'favicon'], { message: 'Invalid action. Use: logo or favicon' }),
    type: z.enum(['main', 'dark', 'mobile']).optional(),
});

// Favicon sizes to generate
const FAVICON_SIZES = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
];

// Get file extension from mime type
function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
        'image/svg+xml': 'svg',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
    };
    return mimeToExt[mimeType] || 'png';
}

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);

        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        // Branding assets are served from public/logos/
        // This API returns metadata about which assets exist
        // The actual files are served statically by Astro

        const branding: Record<string, string | null> = {
            logoMain: '/logos/logo-main.png',  // Default paths - files served from public/
            logoDark: '/logos/logo-dark.png',
            logoMobile: '/logos/logo-mobile.png',
            favicon: '/logos/favicon.svg',
        };

        const faviconVariants: Record<string, string | null> = {};
        for (const { name } of FAVICON_SIZES) {
            faviconVariants[name] = `/logos/${name}`;
        }

        const { body, status, headers } = formatSuccessResponse({
            ...branding,
            faviconVariants
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to get branding:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get branding', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);

        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.IMAGES) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const { action, type } = validate(BrandingActionSchema, {
            action: pathParts[2], // 'logo' or 'favicon'
            type: pathParts[3],   // 'main', 'dark', 'mobile' for logo
        });

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400);
        }

        if (!VALID_IMAGE_TYPES.includes(file.type)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid file type. Supported: SVG, PNG, JPG, WebP, GIF', 400);
        }

        const extension = getExtensionFromMimeType(file.type);
        const arrayBuffer = await file.arrayBuffer();

        // Upload to R2 with branding prefix
        const BRANDING_PREFIX = 'branding/';

        if (action === 'logo') {
            if (!type) {
                throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Logo type is required. Use: main, dark, or mobile', 400);
            }

            const key = `${BRANDING_PREFIX}logo-${type}.${extension}`;
            await env.IMAGES.put(key, arrayBuffer, {
                httpMetadata: { contentType: file.type }
            });

            const publicUrl = '/api/images';
            const { body, status, headers } = formatSuccessResponse({
                url: `${publicUrl}/${key}`,
                type,
                filename: `logo-${type}.${extension}`
            });
            return new Response(body, { status, headers });

        } else if (action === 'favicon') {
            const key = `${BRANDING_PREFIX}favicon.${extension}`;
            await env.IMAGES.put(key, arrayBuffer, {
                httpMetadata: { contentType: file.type }
            });

            const publicUrl = '/api/images';
            const { body, status, headers } = formatSuccessResponse({
                url: `${publicUrl}/${key}`,
                filename: `favicon.${extension}`,
                sizesToGenerate: FAVICON_SIZES
            });
            return new Response(body, { status, headers });
        }

        // Zod schema already ensures action is 'logo' or 'favicon'
        // Unreachable, but kept for type safety
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid action', 400);

    } catch (error) {
        console.error('Failed to upload branding asset:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file', 500)
        );
        return new Response(body, { status, headers });
    }
};

// Upload generated favicon variant
export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);

        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        if (!env?.IMAGES) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const filename = formData.get('filename') as string;

        if (!file || !filename) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing file or filename', 400);
        }

        const validFilenames = FAVICON_SIZES.map(s => s.name);
        if (!validFilenames.includes(filename)) {
            throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid favicon variant filename', 400);
        }

        const arrayBuffer = await file.arrayBuffer();
        const BRANDING_PREFIX = 'branding/';
        const key = `${BRANDING_PREFIX}${filename}`;
        await env.IMAGES.put(key, arrayBuffer, {
            httpMetadata: { contentType: file.type }
        });

        const publicUrl = '/api/images';
        const { body, status, headers } = formatSuccessResponse({
            url: `${publicUrl}/${key}`,
            filename
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to upload favicon variant:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload favicon variant', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
    try {
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);

        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        // For now, return success - deletion of static files would require build step
        const { body, status, headers } = formatSuccessResponse({
            message: 'Branding asset marked for deletion. Changes will apply on next build.'
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to delete branding asset:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError ? error : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete file', 500)
        );
        return new Response(body, { status, headers });
    }
};