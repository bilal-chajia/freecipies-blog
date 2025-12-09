import type { APIRoute } from 'astro';
import { uploadImage, validateImage } from '../../lib/r2';
import type { Env } from '../../lib/db';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';
import {
  formatErrorResponse, formatSuccessResponse, ErrorCodes, AppError
} from '../../lib/error-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.IMAGES || !env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage or database not configured', 500);
    }

    const bucket = env.IMAGES;
    const publicUrl = env.ENVIRONMENT === 'production' ? env.R2_PUBLIC_URL : '/images';

    // Authenticate and authorize user
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError('Insufficient permissions to upload images', 403);
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

    // Validate image
    const validation = validateImage(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    });

    if (!validation.valid) {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, validation.error || 'Invalid image', 400)
      );
      return new Response(body, { status, headers });
    }

    // Get metadata from form
    const alt = formData.get('alt') as string || '';
    const attribution = formData.get('attribution') as string || '';
    const folder = formData.get('folder') as string || '';
    const contextSlug = formData.get('contextSlug') as string || '';

    // Upload to R2
    const result = await uploadImage(
      bucket,
      {
        file,
        filename: file.name,
        contentType: file.type,
        metadata: {
          alt,
          attribution
        },
        folder: folder || undefined,
        contextSlug: contextSlug || undefined
      },
      publicUrl
    );

    // Store image metadata in D1 database
    await env.DB
      .prepare(`
        INSERT INTO media (
          filename, r2_key, url, mime_type,
          size_bytes, alt_text, attribution, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        file.name,
        result.key,
        result.url,
        result.contentType,
        result.size,
        alt,
        attribution,
        'api' // Default uploaded_by
      )
      .run();

    const { body, status, headers } = formatSuccessResponse({
      url: result.url,
      key: result.key,
      filename: result.filename,
      size: result.size,
      contentType: result.contentType
    });
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error('Error uploading image:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload image', 500)
    );
    return new Response(body, { status, headers });
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Database not configured', 500);
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get images from database
    const { results } = await env.DB
      .prepare(`
        SELECT * FROM media
        ORDER BY uploaded_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(limit, offset)
      .all();

    // Get total count
    const { results: countResults } = await env.DB
      .prepare('SELECT COUNT(*) as total FROM media')
      .all();

    const total = (countResults[0] as any).total;

    const { body, status, headers } = formatSuccessResponse(results, {
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      cacheControl: 'public, max-age=300'
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error('Error fetching images:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch images', 500)
    );
    return new Response(body, { status, headers });
  }
};
