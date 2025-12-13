import type { APIRoute } from 'astro';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';
import {
    formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../lib/error-handler';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

// Allowed font MIME types
const ALLOWED_FONT_TYPES = [
    'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
    'application/x-font-ttf', 'application/x-font-otf',
    'application/font-woff', 'application/font-woff2',
    'application/octet-stream' // Some browsers send fonts as this
];

// Allowed extensions
const ALLOWED_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env;

        // Authenticate user
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions to upload fonts', 403);
        }

        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400)
            );
            return new Response(body, { status, headers });
        }

        // Validate file type
        const ext = path.extname(file.name).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid font type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`, 400)
            );
            return new Response(body, { status, headers });
        }

        // Validate file size (5MB max for fonts)
        if (file.size > 5 * 1024 * 1024) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Font file too large (max 5MB)', 400)
            );
            return new Response(body, { status, headers });
        }

        // Create safe filename (remove special chars, preserve extension)
        const baseName = file.name.replace(ext, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeFilename = `${baseName}${ext}`;

        // Determine the fonts directory
        // In development, use the public folder
        const fontsDir = path.join(process.cwd(), 'public', 'fonts');

        // Ensure fonts directory exists
        await fs.mkdir(fontsDir, { recursive: true });

        // Write file
        const filePath = path.join(fontsDir, safeFilename);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        // Return the public URL
        const url = `/fonts/${safeFilename}`;

        const { body, status, headers } = formatSuccessResponse({
            url,
            filename: safeFilename,
            size: file.size
        });
        return new Response(body, { status: 201, headers });
    } catch (error) {
        console.error('Error uploading font:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload font', 500)
        );
        return new Response(body, { status, headers });
    }
};

// GET - List available fonts
export const GET: APIRoute = async ({ locals }) => {
    try {
        const fontsDir = path.join(process.cwd(), 'public', 'fonts');

        try {
            const files = await fs.readdir(fontsDir);
            const fonts = files
                .filter(f => ALLOWED_EXTENSIONS.includes(path.extname(f).toLowerCase()))
                .map(f => ({
                    name: f.replace(path.extname(f), ''),
                    filename: f,
                    url: `/fonts/${f}`
                }));

            const { body, status, headers } = formatSuccessResponse(fonts);
            return new Response(body, { status, headers });
        } catch {
            // Directory doesn't exist yet
            const { body, status, headers } = formatSuccessResponse([]);
            return new Response(body, { status, headers });
        }
    } catch (error) {
        console.error('Error listing fonts:', error);
        const { body, status, headers } = formatErrorResponse(
            new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to list fonts', 500)
        );
        return new Response(body, { status, headers });
    }
};

// DELETE - Remove a font
export const DELETE: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env;

        // Authenticate user
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions to delete fonts', 403);
        }

        // Get filename from query params
        const url = new URL(request.url);
        const filename = url.searchParams.get('filename');

        if (!filename) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Filename is required', 400)
            );
            return new Response(body, { status, headers });
        }

        // Validate extension
        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            const { body, status, headers } = formatErrorResponse(
                new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid file type', 400)
            );
            return new Response(body, { status, headers });
        }

        const fontsDir = path.join(process.cwd(), 'public', 'fonts');
        const filePath = path.join(fontsDir, filename);

        // Delete file
        await fs.unlink(filePath);

        const { body, status, headers } = formatSuccessResponse({ deleted: filename });
        return new Response(body, { status, headers });
    } catch (error) {
        console.error('Error deleting font:', error);
        const { body, status, headers } = formatErrorResponse(
            error instanceof AppError
                ? error
                : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete font', 500)
        );
        return new Response(body, { status, headers });
    }
};

