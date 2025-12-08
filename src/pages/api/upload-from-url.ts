import type { APIRoute } from 'astro';
import { uploadImage } from '../../lib/r2';
import type { Env } from '../../lib/db';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = locals.runtime.env as Env;
        const bucket = env.IMAGES;
        const publicUrl = (env as any).ENVIRONMENT === 'production' ? env.R2_PUBLIC_URL : '/images';

        // Authenticate and authorize user
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.EDITOR)) {
            return createAuthError('Insufficient permissions to upload images', 403);
        }

        // Get request body
        const body = await request.json();
        const { url: imageUrl, alt, attribution, convertToWebp = true, folder, contextSlug } = body;

        if (!imageUrl) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No URL provided'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid URL provided'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch the image from the URL
        const imageResponse = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!imageResponse.ok) {
            return new Response(JSON.stringify({
                success: false,
                error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check content type
        const contentType = imageResponse.headers.get('content-type') || '';
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

        if (!allowedTypes.some(type => contentType.includes(type))) {
            return new Response(JSON.stringify({
                success: false,
                error: `Invalid content type: ${contentType}. Allowed: ${allowedTypes.join(', ')}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get the image data
        const imageBuffer = await imageResponse.arrayBuffer();

        // Check file size (10MB max)
        if (imageBuffer.byteLength > 10 * 1024 * 1024) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Image too large. Maximum size is 10MB'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate filename from URL
        const urlPath = parsedUrl.pathname;
        let originalFilename = urlPath.split('/').pop() || 'image';

        // Clean up filename
        originalFilename = originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');

        // Determine final content type and extension
        let finalContentType = contentType.split(';')[0].trim();
        let finalFilename = originalFilename;

        // For WebP conversion, we'll change the extension
        if (convertToWebp && !contentType.includes('webp')) {
            const baseName = originalFilename.replace(/\.[^.]+$/, '');
            finalFilename = `${baseName}.webp`;
            finalContentType = 'image/webp';
        }

        // Create a File-like object
        const blob = new Blob([imageBuffer], { type: finalContentType });
        const file = new File([blob], finalFilename, { type: finalContentType });

        // Upload to R2
        const result = await uploadImage(
            bucket,
            {
                file,
                filename: finalFilename,
                contentType: finalContentType,
                metadata: {
                    alt: alt || '',
                    attribution: attribution || '',
                    sourceUrl: imageUrl
                },
                folder: folder || undefined,
                contextSlug: contextSlug || undefined
            },
            publicUrl
        );

        // Store image metadata in D1 database
        const db = env.DB;
        await db
            .prepare(`
        INSERT INTO media (
          filename, r2_key, url, mime_type,
          size_bytes, alt_text, attribution, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                finalFilename,
                result.key,
                result.url,
                result.contentType,
                result.size,
                alt || '',
                attribution || '',
                'url-import'
            )
            .run();

        return new Response(JSON.stringify({
            success: true,
            data: {
                url: result.url,
                key: result.key,
                filename: result.filename,
                size: result.size,
                contentType: result.contentType,
                sourceUrl: imageUrl
            }
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error uploading image from URL:', error);

        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to upload image from URL',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
