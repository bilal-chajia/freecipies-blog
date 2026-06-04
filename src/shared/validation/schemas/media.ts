/**
 * Media & Upload Zod Schemas
 * ==========================
 * Schemas for upload, proxy, and media-related API endpoints.
 *
 * ## Naming Convention
 *
 * API JSON payloads use canonical snake_case. These schemas accept and return
 * canonical snake_case data shapes and do not normalize data-shape keys to
 * camelCase.
 */
import { z } from '../helpers';
import { PaginationSchema } from './common';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const hasAnyKey = (value: Record<string, unknown>, keys: readonly string[]): boolean => (
  keys.some(key => Object.prototype.hasOwnProperty.call(value, key))
);

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => (
  Object.keys(value).every(key => keys.includes(key))
);

const CAMEL_CASE_MEDIA_KEYS = [
  'uploadId',
  'baseName',
  'altText',
  'aspectRatio',
  'focalPoint',
  'mimeType',
] as const;

// `upload_key` (the temporary R2 key returned by upload-variant) and `r2_key`
// (the stored key) are the same value under two contract names; accept either
// and emit the canonical `r2_key`. No camelCase fallbacks.
const normalizeVariantInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if (!hasOnlyKeys(value, ['upload_key', 'r2_key', 'width', 'height', 'size_bytes'])) return value;
  return {
    r2_key: value.upload_key ?? value.r2_key,
    width: value.width,
    height: value.height,
    size_bytes: value.size_bytes,
  };
};

const normalizeConfirmUploadInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if (hasAnyKey(value, CAMEL_CASE_MEDIA_KEYS)) return value;
  return {
    upload_id: value.upload_id,
    base_name: value.base_name,
    name: value.name,
    alt_text: value.alt_text,
    caption: value.caption,
    credit: value.credit,
    aspect_ratio: value.aspect_ratio,
    focal_point: value.focal_point,
    mime_type: value.mime_type,
    variants: value.variants,
    placeholder: value.placeholder,
  };
};

const normalizeUpdateMediaInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  if (hasAnyKey(value, CAMEL_CASE_MEDIA_KEYS)) return value;
  return {
    name: value.name,
    alt_text: value.alt_text,
    caption: value.caption,
    credit: value.credit,
    focal_point: value.focal_point,
    aspect_ratio: value.aspect_ratio,
  };
};

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

const VariantInfoSchema = z.preprocess(normalizeVariantInput, z.object({
  r2_key: z.string().min(1),
  width: z.coerce.number().int().nonnegative(),
  height: z.coerce.number().int().nonnegative(),
  size_bytes: z.coerce.number().int().nonnegative().optional(),
}).strict());

/**
 * Schema for a single stored image variant (DB/R2 snake_case format).
 * Flow: client sends snake_case → Zod validates → normalizeMediaVariantsJson → DB stores snake_case.
 */
export const StoredVariantSchema = z.object({
  r2_key: z.string().min(1, 'r2_key is required'),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  size_bytes: z.number().int().nonnegative().optional(),
});

const ResolvedVariantSchema = z.object({
  url: z.string().min(1, 'url is required'),
  width: z.coerce.number().int().nonnegative(),
  height: z.coerce.number().int().nonnegative(),
  size_bytes: z.coerce.number().int().nonnegative().optional(),
});

/**
 * Schema for the full variants_json column written to the DB.
 * All 5 variants (xs, sm, md, lg, original) are required — enforces StrictStorageVariants contract.
 */
export const MediaVariantsJsonSchema = z.object({
  variants: z.object({
    xs: StoredVariantSchema,
    sm: StoredVariantSchema,
    md: StoredVariantSchema,
    lg: StoredVariantSchema,
    original: StoredVariantSchema,
  }),
  placeholder: z.string().min(1, 'LQIP placeholder is required'),
});

export type MediaVariantsJsonInput = z.infer<typeof MediaVariantsJsonSchema>;

const AuthorCreditSnapshotSchema = z.object({
  type: z.literal('author'),
  id: z.coerce.number().int().positive(),
  name: z.string().min(1),
  slug: z.string().min(1),
  avatar: z.object({
    media_id: z.coerce.number().int().positive().optional(),
    alt: z.string().optional(),
    variants: z.object({
      xs: z.union([StoredVariantSchema, ResolvedVariantSchema]),
      sm: z.union([StoredVariantSchema, ResolvedVariantSchema]),
    }),
  }).optional(),
});

/** POST /api/media/confirm body */
export const ConfirmUploadSchema = z.preprocess(normalizeConfirmUploadInput, z.object({
  upload_id: z.string().min(1),
  base_name: z.string().min(1),
  name: z.string().min(1),
  alt_text: z.string().min(1),
  caption: z.string().min(1, 'Caption is required'),
  credit: AuthorCreditSnapshotSchema,
  aspect_ratio: z.string().nullable().optional(),
  focal_point: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  mime_type: z.string().min(1),
  variants: z.object({
    original: VariantInfoSchema,
    lg: VariantInfoSchema,
    md: VariantInfoSchema,
    sm: VariantInfoSchema,
    xs: VariantInfoSchema,
  }),
  placeholder: z.string().min(1),
}).strict());


/** PATCH /api/media/:id body — update metadata without re-uploading variants */
export const UpdateMediaSchema = z.preprocess(normalizeUpdateMediaInput, z.object({
  name: z.string().min(1).optional(),
  alt_text: z.string().min(1).optional(),
  caption: z.string().min(1).optional(),
  credit: AuthorCreditSnapshotSchema.optional(),
  focal_point: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  aspect_ratio: z.string().nullable().optional(),
}).strict());

/** POST /api/media/upload-variant fields (FormData) */
export const VariantUploadFields = z.object({
  variantName: z.enum(['original', 'lg', 'md', 'sm', 'xs']),
  baseName: z.string().min(1),
  uploadId: z.string().optional(),
  width: z.coerce.number().int().nonnegative(),
  height: z.coerce.number().int().nonnegative(),
});


/** Query params for GET /api/proxy-image */
export const ProxyImageQuery = z.object({
  url: z.string().url('A valid URL is required'),
  width: z.coerce.number().int().min(1).max(4000).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
});
