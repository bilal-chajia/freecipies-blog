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
  short_description: DescriptionField,
  color: z.string().regex(/^#[0-9a-f]{6,8}$/i, 'Color must be a valid hex code (e.g. #ff5500)').optional(),
  parent_id: z.coerce.number().int().positive().nullable().optional(),
  workflow_status: z.enum(['draft', 'published', 'archived']).optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  images_json: z.string().optional(),
  seo_json: z.string().optional(),
  presentation_json: z.string().optional(),
}).passthrough();

export const UpdateCategorySchema = CreateCategorySchema.partial().passthrough();
