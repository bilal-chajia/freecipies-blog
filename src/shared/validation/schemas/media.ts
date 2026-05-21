/**
 * Media & Upload Zod Schemas
 * ==========================
 * Schemas for upload, proxy, and media-related API endpoints.
 *
 * ## Naming Convention
 *
 * API JSON payloads use snake_case. Schemas normalize request bodies to
 * camelCase for TypeScript services, then storage helpers serialize DB JSON
 * back to snake_case.
 */
import { z } from '../helpers';
import { PaginationSchema } from './common';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const normalizeVariantInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    r2Key: value.upload_key ?? value.uploadKey ?? value.r2_key ?? value.r2Key,
    width: value.width,
    height: value.height,
    sizeBytes: value.size_bytes ?? value.sizeBytes,
  };
};

const normalizeConfirmUploadInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    uploadId: value.upload_id ?? value.uploadId,
    baseName: value.base_name ?? value.baseName,
    name: value.name,
    altText: value.alt_text ?? value.altText,
    caption: value.caption,
    credit: value.credit,
    aspectRatio: value.aspect_ratio ?? value.aspectRatio,
    focalPoint: value.focal_point ?? value.focalPoint,
    mimeType: value.mime_type ?? value.mimeType,
    variants: value.variants,
    placeholder: value.placeholder,
  };
};

const normalizeUpdateMediaInput = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    name: value.name,
    altText: value.alt_text ?? value.altText,
    caption: value.caption,
    credit: value.credit,
    focalPoint: value.focal_point ?? value.focalPoint,
    aspectRatio: value.aspect_ratio ?? value.aspectRatio,
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
  r2Key: z.string().min(1),
  width: z.coerce.number().int().nonnegative(),
  height: z.coerce.number().int().nonnegative(),
  sizeBytes: z.coerce.number().int().nonnegative().optional(),
}));

/**
 * Schema for a single stored image variant (DB/R2 snake_case format).
 * Flow: client sends camelCase → Zod validates → normalizeMediaVariantsJson converts → DB stores snake_case
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
  uploadId: z.string().min(1),
  baseName: z.string().min(1),
  name: z.string().min(1),
  altText: z.string().min(1),
  caption: z.string().min(1, 'Caption is required'),
  credit: AuthorCreditSnapshotSchema,
  aspectRatio: z.string().nullable().optional(),
  focalPoint: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  mimeType: z.string().min(1),
  variants: z.object({
    original: VariantInfoSchema,
    lg: VariantInfoSchema,
    md: VariantInfoSchema,
    sm: VariantInfoSchema,
    xs: VariantInfoSchema,
  }),
  placeholder: z.string().min(1),
}));


/** PATCH /api/media/:id body — update metadata without re-uploading variants */
export const UpdateMediaSchema = z.preprocess(normalizeUpdateMediaInput, z.object({
  name: z.string().min(1).optional(),
  altText: z.string().min(1).optional(),
  caption: z.string().min(1).optional(),
  credit: AuthorCreditSnapshotSchema.optional(),
  focalPoint: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  aspectRatio: z.string().nullable().optional(),
}));

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
