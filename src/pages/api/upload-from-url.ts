import type { APIRoute } from 'astro';
import { uploadImage, createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';
import { getImageUploadSettings } from '@modules/settings';
import { IMAGE_SUPPORTED_TYPES } from '@shared/constants/image-upload';
import { calculateAspectRatio, getImageDimensions } from '@shared/utils/imageMeta';

function isPrivateHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true;
  if (host.endsWith('.local')) return true;
  // IPv4 private ranges
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [a, b] = ipv4Match.slice(1).map(Number);
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
    }

    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

    // Authenticate
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    // Load settings
    const settings = await getImageUploadSettings(env.DB);
    const MAX_SIZE_BYTES = settings.maxFileSizeMB * 1024 * 1024;
    const allowedTypes = IMAGE_SUPPORTED_TYPES;

    const body = await request.json() as {
      imageUrl?: string;
      url?: string;
      alt?: string;
      attribution?: string;
      caption?: string;
    };

    const imageUrl = body.imageUrl || body.url;
    const { alt, attribution, caption } = body;

    if (!imageUrl) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No URL provided', 400);
    }

    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid URL', 400);
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Only HTTP/HTTPS URLs are allowed', 400);
    }
    if (isPrivateHost(parsed)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'URL host is not allowed', 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Failed to fetch image from URL: ${response.statusText}`, 400);
    }

    const contentTypeHeader = response.headers.get('content-type') || '';
    const contentType = contentTypeHeader.split(';')[0].trim();
    if (!allowedTypes.includes(contentType as any)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Unsupported image type: ${contentType || 'unknown'}`, 400);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_SIZE_BYTES) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB`, 400);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB`, 400);
    }

    const blob = new Blob([arrayBuffer], { type: contentType || 'image/jpeg' });

    // Sanitize filename
    const rawFilename = imageUrl.split('/').pop()?.split('?')[0] || `import-${Date.now()}`;
    const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_'); // Basic sanitization

    // Get dimensions
    const dimensions = getImageDimensions(new Uint8Array(arrayBuffer));

    // Upload to R2 (reuse buffer)
    const result = await uploadImage(
      env.IMAGES,
      {
        file: blob,
        filename,
        contentType: blob.type || 'image/jpeg',
        folder: 'media',
        metadata: {
          alt: alt || '',
          credit: attribution || '',
        },
        arrayBuffer,
      },
      publicUrl
    );

    const variants = {
      variants: {
        original: {
          url: result.url,
          r2_key: result.key,
          width: dimensions.width,
          height: dimensions.height,
          sizeBytes: result.size,
        },
      },
      placeholder: '',
    };

    // Build focal point JSON
    const focalPointJson = JSON.stringify({ x: 50, y: 50 });
    const aspectRatio = dimensions.width && dimensions.height
      ? calculateAspectRatio(dimensions.width, dimensions.height)
      : null;

    // Create DB Record
    const mediaData: NewMedia = {
      name: filename,
      altText: alt || '',
      caption: caption || '',
      credit: attribution || '',
      mimeType: result.contentType,
      variantsJson: JSON.stringify(variants),
      focalPointJson,
      aspectRatio,
    };

    const newMedia = await createMedia(env.DB, mediaData);

    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to save media record', 500);
    }

    const { body: responseBody, status, headers } = formatSuccessResponse(newMedia);
    return new Response(responseBody, { status: 201, headers });

  } catch (error) {
    console.error('Error uploading from URL:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Import from URL failed', 500)
    );
    return new Response(body, { status, headers });
  }
};
