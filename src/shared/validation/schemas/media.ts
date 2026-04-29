/**
 * Media & Upload Zod Schemas
 * ==========================
 * Schemas for upload, proxy, and media-related API endpoints.
 */
import { z } from '../helpers';
import { PaginationSchema } from './common';

/** GET /api/media query params */
export const MediaListQuery = PaginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(500).default(60),
  type: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).transform(({ page, limit, ...rest }) => ({
  page,
  limit,
  offset: (page - 1) * limit,
  ...rest
}));

/** POST /api/media/bulk-delete body */
export const BulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

/** Schema for individual image variant info */
const VariantInfoSchema = z.object({
  r2Key: z.string().min(1),
  width: z.coerce.number().int().nonnegative(),
  height: z.coerce.number().int().nonnegative(),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
});

/** POST /api/media/confirm body */
export const ConfirmUploadSchema = z.object({
  uploadId: z.string().min(1),
  baseName: z.string().min(1),
  name: z.string().min(1),
  altText: z.string().min(1),
  caption: z.string().optional(),
  credit: z.string().optional(),
  aspectRatio: z.string().optional(),
  focalPoint: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  mimeType: z.string().min(1),
  variants: z.object({
    original: VariantInfoSchema.optional(),
    lg: VariantInfoSchema,
    md: VariantInfoSchema,
    sm: VariantInfoSchema,
    xs: VariantInfoSchema,
  }),
  placeholder: z.string().min(1),
});

/** GET /api/media/upload-urls query params */
export const UploadUrlsQuery = z.object({
  baseName: z.string().min(1),
  variants: z.string().min(1), // comma-separated
  mimeType: z.string().min(1),
  originalExt: z.string().min(1),
});

/** POST /api/media/upload-variant fields (FormData) */
export const VariantUploadFields = z.object({
  variantName: z.enum(['original', 'lg', 'md', 'sm', 'xs']),
  baseName: z.string().min(1),
  uploadId: z.string().optional(),
  width: z.coerce.number().int().nonnegative(),
  height: z.coerce.number().int().nonnegative(),
});

/** Body for POST /api/upload-from-url — accepts imageUrl OR url as the source */
export const UploadFromUrlSchema = z.object({
  imageUrl: z.string().url('Invalid URL').optional(),
  url: z.string().url('Invalid URL').optional(),
  alt: z.string().optional(),
  attribution: z.string().optional(),
  caption: z.string().optional(),
}).refine(
  (data) => data.imageUrl || data.url,
  { message: 'No URL provided', path: ['url'] },
);

/** Query params for GET /api/proxy-image */
export const ProxyImageQuery = z.object({
  url: z.string().url('A valid URL is required'),
  width: z.coerce.number().int().min(1).max(4000).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
});
