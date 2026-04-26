import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { Env } from '@shared/types';
import { formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import { validate, z } from '@shared/validation';

export const prerender = false;

/** Schema for image path param — must be non-empty and not contain path traversal */
const ImagePathSchema = z.string().min(1, 'Image path is required').refine(
  (p) => !p.includes('..'),
  'Invalid image path',
);

export const GET: APIRoute = async ({ params, locals, request }) => {
  const rawPath = params.path;
  const rawKey = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;

  // Validate path param
  const key = validate(ImagePathSchema, rawKey);

  // In dev mode (pnpm dev), the R2 bucket binding is not available via
  // Vite's server — only pnpm preview provides real Cloudflare bindings.
  // Fall back to proxying from R2_PUBLIC_URL when the binding is missing.
  if (!env?.IMAGES) {
    const r2PublicUrl = env?.R2_PUBLIC_URL || import.meta.env.R2_PUBLIC_URL;
    if (r2PublicUrl && key) {
      const imageUrl = `${r2PublicUrl.replace(/\/$/, '')}/${key}`;
      try {
        const upstream = await fetch(imageUrl, {
          headers: { 'If-None-Match': request.headers.get('If-None-Match') || '' },
        });
        if (upstream.ok || upstream.status === 304) {
          const responseHeaders = new Headers();
          const contentType = upstream.headers.get('Content-Type');
          const cacheControl = upstream.headers.get('Cache-Control');
          const etag = upstream.headers.get('ETag');
          if (contentType) responseHeaders.set('Content-Type', contentType);
          responseHeaders.set('Cache-Control', cacheControl || 'public, max-age=31536000, immutable');
          if (etag) responseHeaders.set('ETag', etag);
          return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
        }
      } catch {
        // Fall through to 503 below
      }
    }
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured and no R2_PUBLIC_URL fallback available', 503)
    );
    return new Response(body, { status, headers });
  }

  // Path already validated by Zod schema above (non-empty, no '..')

  const ifNoneMatch = request.headers.get('If-None-Match');
  let object = await env.IMAGES.get(key);

  // Flashback: Try without 'media/' prefix if not found
  if (!object && key.startsWith('media/')) {
    const rootKey = key.replace('media/', '');
    object = await env.IMAGES.get(rootKey);
  }

  if (!object) {
    // Local R2 binding is available but bucket is empty (dev mode with local R2 simulation).
    // Try fetching from the remote R2 CDN as a fallback before returning 404.
    const r2PublicUrl = env?.R2_PUBLIC_URL || import.meta.env.R2_PUBLIC_URL;
    if (r2PublicUrl && key) {
      const imageUrl = `${r2PublicUrl.replace(/\/$/, '')}/${key}`;
      try {
        const upstream = await fetch(imageUrl, {
          headers: { 'If-None-Match': ifNoneMatch || '' },
        });
        if (upstream.ok || upstream.status === 304) {
          const responseHeaders = new Headers();
          const contentType = upstream.headers.get('Content-Type');
          const cacheControl = upstream.headers.get('Cache-Control');
          const etag = upstream.headers.get('ETag');
          if (contentType) responseHeaders.set('Content-Type', contentType);
          responseHeaders.set('Cache-Control', cacheControl || 'public, max-age=31536000, immutable');
          if (etag) responseHeaders.set('ETag', etag);
          return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
        }
      } catch {
        // Fall through to 404 below
      }
    }
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.NOT_FOUND, `Image not found: ${key}`, 404)
    );
    return new Response(body, { status, headers });
  }

  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  const metadata = object.httpMetadata;
  if (metadata?.contentType) {
    headers.set('Content-Type', metadata.contentType);
  }
  if (metadata?.contentDisposition) {
    headers.set('Content-Disposition', metadata.contentDisposition);
  }
  if (metadata?.cacheControl) {
    headers.set('Cache-Control', metadata.cacheControl);
  } else {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  if (metadata?.contentEncoding) {
    headers.set('Content-Encoding', metadata.contentEncoding);
  }
  if (metadata?.contentLanguage) {
    headers.set('Content-Language', metadata.contentLanguage);
  }
  if (!headers.get('Content-Type')) {
    headers.set('Content-Type', 'application/octet-stream');
  }

  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag);
  }

  headers.set('Accept-Ranges', 'bytes');

  return new Response(object.body as any, { status: 200, headers });
};
