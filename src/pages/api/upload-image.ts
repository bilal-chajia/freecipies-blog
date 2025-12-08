import type { APIRoute } from 'astro';
import { uploadImage, validateImage } from '../../lib/r2';
import type { Env } from '../../lib/db';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env as Env;
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
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate image
    const validation = validateImage(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    });

    if (!validation.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: validation.error
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
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
    const db = env.DB;
    await db
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

    return new Response(JSON.stringify({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        filename: result.filename,
        size: result.size,
        contentType: result.contentType
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env as Env;
    const db = env.DB;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get images from database
    const { results } = await db
      .prepare(`
        SELECT * FROM media
        ORDER BY uploaded_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(limit, offset)
      .all();

    // Get total count
    const { results: countResults } = await db
      .prepare('SELECT COUNT(*) as total FROM media')
      .all();

    const total = (countResults[0] as any).total;

    return new Response(JSON.stringify({
      success: true,
      data: results,
      pagination: {
        limit,
        offset,
        total
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error fetching images:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch images',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

