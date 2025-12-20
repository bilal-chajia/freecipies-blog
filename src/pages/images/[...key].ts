import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { getImage } from '@modules/media';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, request }) => {
    try {
        const key = params.key;
        if (!key) {
            return new Response('Image key required', { status: 400 });
        }

        const env = locals.runtime.env as Env;
        const bucket = env.IMAGES;

        // Check for conditional GET (If-None-Match)
        const ifNoneMatch = request.headers.get('If-None-Match');

        // Get object from R2
        const r2Key = key;

        const object = await getImage(bucket, r2Key);

        if (!object) {
            return new Response('Image not found', { status: 404 });
        }

        // Handle ETag / 304 Not Modified
        const etag = object.httpEtag;
        if (ifNoneMatch && ifNoneMatch === etag) {
            return new Response(null, { status: 304 });
        }

        const headers = new Headers();

        // Manually copy metadata to avoid "Cannot stringify arbitrary non-POJOs" error
        // which might happen with object.writeHttpMetadata(headers) in some envs
        if (object.httpMetadata) {
            if (object.httpMetadata.contentType) {
                headers.set('Content-Type', object.httpMetadata.contentType);
            }
            if (object.httpMetadata.contentDisposition) {
                headers.set('Content-Disposition', object.httpMetadata.contentDisposition);
            }
            if (object.httpMetadata.cacheControl) {
                headers.set('Cache-Control', object.httpMetadata.cacheControl);
            } else {
                headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            }
            if (object.httpMetadata.contentEncoding) {
                headers.set('Content-Encoding', object.httpMetadata.contentEncoding);
            }
            if (object.httpMetadata.contentLanguage) {
                headers.set('Content-Language', object.httpMetadata.contentLanguage);
            }
        }

        headers.set('etag', etag);

        return new Response(object.body as any, {
            headers,
        });

    } catch (error) {
        console.error('Error serving image:', error);
        return new Response(`Internal Server Error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
    }
};
