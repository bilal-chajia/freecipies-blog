import type { APIRoute } from 'astro';
import { uploadImage, createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

/**
 * Extract image dimensions from binary data (supports PNG, JPEG, WebP, GIF)
 */
function getImageDimensions(data: Uint8Array): { width: number; height: number } {
  // PNG: bytes 16-23 contain width and height (4 bytes each, big-endian)
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
    const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
    return { width, height };
  }

  // JPEG: Find SOF0 marker (0xFFC0) and read dimensions
  if (data[0] === 0xFF && data[1] === 0xD8) {
    let offset = 2;
    while (offset < data.length - 8) {
      if (data[offset] === 0xFF) {
        const marker = data[offset + 1];
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          const height = (data[offset + 5] << 8) | data[offset + 6];
          const width = (data[offset + 7] << 8) | data[offset + 8];
          return { width, height };
        }
        const length = (data[offset + 2] << 8) | data[offset + 3];
        offset += 2 + length;
      } else {
        offset++;
      }
    }
  }

  // WebP: RIFF header, then VP8/VP8L/VP8X chunk
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
    // VP8X extended format
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x58) {
      const width = ((data[24] | (data[25] << 8) | (data[26] << 16)) & 0xFFFFFF) + 1;
      const height = ((data[27] | (data[28] << 8) | (data[29] << 16)) & 0xFFFFFF) + 1;
      return { width, height };
    }
    // VP8L lossless
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x4C) {
      const bits = (data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24)) >>> 0;
      const width = (bits & 0x3FFF) + 1;
      const height = ((bits >> 14) & 0x3FFF) + 1;
      return { width, height };
    }
    // VP8 lossy
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x20) {
      const width = (data[26] | (data[27] << 8)) & 0x3FFF;
      const height = (data[28] | (data[29] << 8)) & 0x3FFF;
      return { width, height };
    }
  }

  // GIF: bytes 6-9 contain width and height (2 bytes each, little-endian)
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);
    return { width, height };
  }

  return { width: 0, height: 0 };
}

/**
 * Calculate simplified aspect ratio string (e.g., "16:9", "4:3", "1:1")
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  // Simplify common ratios
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2';
  if (Math.abs(ratio - 2 / 3) < 0.05) return '2:3';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16';

  return `${w}:${h}`;
}


export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env as Env;

    if (!env?.IMAGES) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500);
    }

    const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

    // Authenticate (Optional? Usually yes for upload)
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    // Allow EDITOR or ADMIN
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string;
    const attribution = formData.get('attribution') as string;
    const caption = formData.get('caption') as string;

    // 1. Validate file
    if (!file) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `File too large. Max ${maxSize / 1024 / 1024}MB`, 400);
    }
    if (!allowedTypes.includes(file.type)) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, `Invalid file type: ${file.type}`, 400);
    }

    // 2. Get real image dimensions
    let width = 0;
    let height = 0;
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use image-size detection from first bytes (works for jpg/png/webp/gif)
      const dimensions = getImageDimensions(new Uint8Array(arrayBuffer));
      width = dimensions.width;
      height = dimensions.height;
    } catch (e) {
      console.warn('Could not extract image dimensions:', e);
    }

    // 3. Upload to R2
    const result = await uploadImage(
      env.IMAGES,
      {
        file,
        filename: file.name,
        contentType: file.type,
        folder: 'media',
        metadata: {
          alt: alt || '',
          credit: attribution || ''
        }
      },
      publicUrl
    );

    // 4. Store ONLY original variant with real data (no fake variants)
    // Components using this endpoint get single-image storage
    const variants = {
      original: {
        url: result.url,
        r2_key: result.key,
        width,
        height,
        sizeBytes: result.size
      }
    };

    // 5. Calculate real aspect ratio
    const aspectRatio = width && height ? calculateAspectRatio(width, height) : null;

    // 6. Insert into D1 using Service
    const mediaData: NewMedia = {
      name: file.name,
      altText: alt || '',
      caption: caption || '',
      credit: attribution || '',
      mimeType: result.contentType,
      variantsJson: JSON.stringify({ variants, placeholder: '' }),
      focalPointJson: JSON.stringify({ x: 50, y: 50 }),
      aspectRatio
    };

    const newMedia = await createMedia(env.DB, mediaData);

    if (!newMedia) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to save media record', 500);
    }

    const { body, status, headers } = formatSuccessResponse(newMedia);
    return new Response(body, { status: 201, headers });

  } catch (error) {
    console.error('Error uploading image:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Upload failed', 500)
    );
    return new Response(body, { status, headers });
  }
};
