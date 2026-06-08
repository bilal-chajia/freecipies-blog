/**
 * Common Zod Schemas
 * ==================
 * Reusable schemas shared across multiple API domains.
 */
import { z } from '../helpers';

/** Positive integer ID from path param (coerces string → number) */
export const IdParam = z.object({
  id: z.coerce.number().int().positive('ID must be a positive integer'),
});

/** Slug or numeric ID from path param */
export const SlugOrIdParam = z.object({
  slug: z.string().min(1, 'Slug or ID is required'),
});

/** Pagination query params schema for extension */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

/** Pagination query params with sensible defaults + computed offset */
export const PaginationQuery = PaginationSchema.transform(({ page, limit }) => ({
  page,
  limit,
  offset: (page - 1) * limit,
}));

/** Generic name field (used by categories, tags, authors, etc.) */
export const LabelField = z.string().min(1, 'Label is required').max(200);
export const SlugField = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes');
export const DescriptionField = z.string().max(2000).optional();

/** Type helper — extract inferred type from a schema */
export type InferSchema<T extends z.ZodTypeAny> = z.infer<T>;
