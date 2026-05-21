/**
 * Category Zod Schemas
 * ====================
 * Validation schemas for category create/update API endpoints.
 */
import { z } from '../helpers';
import { LabelField, SlugField, DescriptionField } from './common';

export const CreateCategorySchema = z.object({
  slug: SlugField,
  label: LabelField,
  shortDescription: DescriptionField,
  color: z.string().regex(/^#[0-9a-f]{6,8}$/i, 'Color must be a valid hex code (e.g. #ff5500)').optional(),
  parentId: z.coerce.number().int().positive().optional(),
  isOnline: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  imagesJson: z.string().optional(),
  seoJson: z.string().optional(),
  configJson: z.string().optional(),
}).passthrough();

export const UpdateCategorySchema = CreateCategorySchema.partial().passthrough();
