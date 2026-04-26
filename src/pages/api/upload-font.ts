import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError } from '@shared/utils';
import fs from 'node:fs/promises';
import path from 'node:path';
import { validate, validateQuery, z } from '@shared/validation';

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

        // Validate file metadata with Zod
        const ext = path.extname(file.name).toLowerCase();
        validate(
          z.object({
            ext: z.string().refine(
              (e) => ALLOWED_EXTENSIONS.includes(e),
              { message: `Invalid font type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }
            ),
            size: z.number().max(5 * 1024 * 1024, 'Font file too large (max 5MB)'),
          }),
          { ext, size: file.size }
        );

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
        const buffer = new Uint8Array(await file.arrayBuffer());
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


        // Authenticate user
        const jwtSecret = env?.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions to delete fonts', 403);
        }

        // Validate filename query param with Zod
        const url = new URL(request.url);
        const { filename } = validateQuery(
          url.searchParams,
          z.object({ filename: z.string().min(1, 'Filename is required') })
        );

        // Validate extension
        const ext = path.extname(filename).toLowerCase();
        validate(
          z.string().refine(
            (e) => ALLOWED_EXTENSIONS.includes(e),
            { message: 'Invalid file type' }
          ),
          ext
        );

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

