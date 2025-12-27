import type { APIRoute } from 'astro';
import type { Env } from '@shared/types';
import { formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, request }) => {
  const env = (locals as any).runtime?.env as Env;

  if (!env?.IMAGES) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500)
    );
    return new Response(body, { status, headers });
  }

  const pathParam = params.path;
  const key = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;

  if (!key || key.includes('..')) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid image path', 400)
    );
    return new Response(body, { status, headers });
  }

  const ifNoneMatch = request.headers.get('If-None-Match');
  const object = await env.IMAGES.get(key);
  if (!object) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.NOT_FOUND, 'Image not found', 404)
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
