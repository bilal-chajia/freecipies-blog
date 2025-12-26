/**
 * Media Upload URLs API - Generate presigned URLs for direct R2 upload
 * ====================================================================
 * 
 * GET /api/media/upload-urls
 *   Query params:
 *     - baseName: string (e.g., "apple-pie-photo")
 *     - variants: string (comma-separated, e.g., "original,lg,md,sm,xs")
 *     - mimeType: string (e.g., "image/webp")
 * 
 *   Returns:
 *     {
 *       success: true,
 *       data: {
 *         uploadId: "unique-upload-id",
 *         urls: {
 *           original: { uploadUrl: "...", r2Key: "..." },
 *           lg: { uploadUrl: "...", r2Key: "..." },
 *           ...
 *         }
 *       }
 *     }
 */

import type { APIRoute } from 'astro';
import { AwsClient } from 'aws4fetch';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

// Variant sizes for reference
const VARIANT_EXTENSIONS: Record<string, string> = {
  original: '', // Keep original extension
  lg: 'webp',
  md: 'webp',
  sm: 'webp',
  xs: 'webp',
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const env = (locals as any).runtime?.env as Env & {
      R2_ACCESS_KEY_ID?: string;
      R2_SECRET_ACCESS_KEY?: string;
      CLOUDFLARE_ACCOUNT_ID?: string;
      R2_BUCKET_NAME?: string;
    };

    // Validate R2 credentials
    if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.CLOUDFLARE_ACCOUNT_ID) {
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        'R2 credentials not configured. Add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and CLOUDFLARE_ACCOUNT_ID to environment.',
        500
      );
    }

    // Authenticate
    const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR) && !hasRole(authContext, AuthRoles.ADMIN)) {
      return createAuthError('Insufficient permissions', 403);
    }

    // Parse query params
    const baseName = url.searchParams.get('baseName');
    const variantsParam = url.searchParams.get('variants') || 'lg,md,sm,xs';
    const mimeType = url.searchParams.get('mimeType') || 'image/webp';
    const originalExt = url.searchParams.get('originalExt') || 'jpg';

    if (!baseName) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'baseName is required', 400);
    }

    const variants = variantsParam.split(',').filter(v => v.trim());
    const timestamp = Date.now();
    const uploadId = `${timestamp}-${crypto.randomUUID().slice(0, 8)}`;
    const folder = 'media';

    // Create AWS client for R2
    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });

    const bucketName = env.R2_BUCKET_NAME || 'recipes-saas-media';
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    // Generate presigned URLs for each variant
    const urls: Record<string, { uploadUrl: string; r2Key: string }> = {};

    for (const variant of variants) {
      // Determine extension
      const ext = variant === 'original' ? originalExt : (VARIANT_EXTENSIONS[variant] || 'webp');
      const suffix = variant === 'original' ? '' : `-${variant}`;
      const r2Key = `${folder}/${baseName}${suffix}-${uploadId}.${ext}`;

      // Generate presigned PUT URL (valid for 10 minutes)
      const signedUrl = await r2.sign(
        new Request(`${r2Endpoint}/${bucketName}/${r2Key}`, {
          method: 'PUT',
        }),
        {
          aws: { signQuery: true },
          expiresIn: 600, // 10 minutes
        }
      );

      urls[variant] = {
        uploadUrl: signedUrl.url,
        r2Key,
      };
    }

    // Return the upload URLs
    const { body, status, headers } = formatSuccessResponse({
      uploadId,
      baseName,
      folder,
      urls,
    });

    return new Response(body, { status, headers });

  } catch (error) {
    console.error('Error generating upload URLs:', error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError
        ? error
        : new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to generate upload URLs', 500)
    );
    return new Response(body, { status, headers });
  }
};
