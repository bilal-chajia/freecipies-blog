import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';

export const prerender = false;

const LOGOS_DIR = path.join(process.cwd(), 'public', 'logos');

// Ensure logos directory exists
async function ensureLogosDir() {
    try {
        await fs.access(LOGOS_DIR);
    } catch {
        await fs.mkdir(LOGOS_DIR, { recursive: true });
    }
}

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

// Valid logo types
const VALID_LOGO_TYPES = ['main', 'dark', 'mobile'];
const VALID_IMAGE_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Favicon sizes to generate
const FAVICON_SIZES = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
];

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        await ensureLogosDir();

        // Read all files in the logos directory
        const files = await fs.readdir(LOGOS_DIR);

        const branding: Record<string, string | null> = {
            logoMain: null,
            logoDark: null,
            logoMobile: null,
            favicon: null,
        };

        // Check for logo files
        for (const file of files) {
            if (file.startsWith('logo-main.')) {
                branding.logoMain = `/logos/${file}`;
            } else if (file.startsWith('logo-dark.')) {
                branding.logoDark = `/logos/${file}`;
            } else if (file.startsWith('logo-mobile.')) {
                branding.logoMobile = `/logos/${file}`;
            } else if (file.startsWith('favicon.') && !file.includes('-')) {
                branding.favicon = `/logos/${file}`;
            }
        }

        // Check for generated favicon variants
        const faviconVariants: Record<string, string | null> = {};
        for (const { name } of FAVICON_SIZES) {
            if (files.includes(name)) {
                faviconVariants[name] = `/logos/${name}`;
            }
        }

        const { body, status, headers } = formatSuccessResponse({
            ...branding,
            faviconVariants
        });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Failed to get branding:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to get branding', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        await ensureLogosDir();

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Expected: /api/branding/logo/main or /api/branding/favicon
        const action = pathParts[2]; // 'logo' or 'favicon'
        const type = pathParts[3]; // 'main', 'dark', 'mobile' for logo

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400)
            );
            return new Response(body, { status, headers });
        }

        if (!VALID_IMAGE_TYPES.includes(file.type)) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid file type. Supported: SVG, PNG, JPG, WebP, GIF', 400)
            );
            return new Response(body, { status, headers });
        }

        const extension = getExtensionFromMimeType(file.type);
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        if (action === 'logo') {
            if (!type || !VALID_LOGO_TYPES.includes(type)) {
                const { body, status, headers } = formatErrorResponse(
                    new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid logo type. Use: main, dark, or mobile', 400)
                );
                return new Response(body, { status, headers });
            }

            // Remove existing logo of this type (any extension)
            const files = await fs.readdir(LOGOS_DIR);
            for (const existingFile of files) {
                if (existingFile.startsWith(`logo-${type}.`)) {
                    try {
                        await fs.unlink(path.join(LOGOS_DIR, existingFile));
                    } catch (e: any) {
                        if (e.code !== 'ENOENT') throw e;
                    }
                }
            }

            // Save new logo
            const filename = `logo-${type}.${extension}`;
            await fs.writeFile(path.join(LOGOS_DIR, filename), uint8Array);

            const { body, status, headers } = formatSuccessResponse({
                url: `/logos/${filename}`,
                type,
                filename
            });
            return new Response(body, { status, headers });

        } else if (action === 'favicon') {
            // Save the original favicon
            const faviconFilename = `favicon.${extension}`;
            await fs.writeFile(path.join(LOGOS_DIR, faviconFilename), uint8Array);

            const { body, status, headers } = formatSuccessResponse({
                url: `/logos/${faviconFilename}`,
                filename: faviconFilename,
                sizesToGenerate: FAVICON_SIZES
            });
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid action', 400)
        );
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to upload branding asset:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file', 500)
        );
        return new Response(body, { status, headers });
    }
};

// Upload generated favicon variant
export const PUT: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        await ensureLogosDir();

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const filename = formData.get('filename') as string;

        if (!file || !filename) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Missing file or filename', 400)
            );
            return new Response(body, { status, headers });
        }

        // Validate filename is a valid favicon variant
        const validFilenames = FAVICON_SIZES.map(s => s.name);
        if (!validFilenames.includes(filename)) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid favicon variant filename', 400)
            );
            return new Response(body, { status, headers });
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await fs.writeFile(path.join(LOGOS_DIR, filename), uint8Array);

        const { body, status, headers } = formatSuccessResponse({
            url: `/logos/${filename}`,
            filename
        });
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to upload favicon variant:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload favicon variant', 500)
        );
        return new Response(body, { status, headers });
    }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;

        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const action = pathParts[2]; // 'logo' or 'favicon'
        const type = pathParts[3]; // 'main', 'dark', 'mobile' for logo

        await ensureLogosDir();
        const files = await fs.readdir(LOGOS_DIR);

        if (action === 'logo' && type && VALID_LOGO_TYPES.includes(type)) {
            // Delete logo of specified type
            for (const file of files) {
                if (file.startsWith(`logo-${type}.`)) {
                    try {
                        await fs.unlink(path.join(LOGOS_DIR, file));
                    } catch (e: any) {
                        if (e.code !== 'ENOENT') throw e;
                    }
                }
            }

            const { body, status, headers } = formatSuccessResponse({
                message: `Logo ${type} deleted`
            });
            return new Response(body, { status, headers });

        } else if (action === 'favicon') {
            // Delete favicon and all variants
            const faviconFiles = files.filter(f =>
                f.startsWith('favicon') ||
                f.startsWith('apple-touch-icon') ||
                f.startsWith('android-chrome')
            );

            for (const file of faviconFiles) {
                try {
                    await fs.unlink(path.join(LOGOS_DIR, file));
                } catch (e: any) {
                    if (e.code !== 'ENOENT') throw e;
                }
            }

            const { body, status, headers } = formatSuccessResponse({
                message: 'Favicon and all variants deleted'
            });
            return new Response(body, { status, headers });
        }

        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid delete target', 400)
        );
        return new Response(body, { status, headers });

    } catch (error) {
        console.error('Failed to delete branding asset:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete file', 500)
        );
        return new Response(body, { status, headers });
    }
};
