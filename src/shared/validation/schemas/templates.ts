/**
 * Templates Domain Zod Schemas
 * =============================
 * Validation schemas for template creation and update endpoints.
 */
import { z } from '../helpers';
import { SlugField, LabelField } from './common';

/** JSON string or element array for elements_json. */
const ElementsJsonField = z.union([z.string(), z.array(z.record(z.string(), z.unknown()))]).optional();

/** Hex color string */
const ColorField = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color').optional();

/**
 * Schema for creating a template.
 * API payloads use snake_case at the boundary.
 */
export const CreateTemplateSchema = z.object({
  slug: SlugField,
  name: LabelField,
  description: z.union([z.string().max(2000), z.null(), z.undefined()]).optional(),
  category: z.string().max(100).optional(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  elements_json: ElementsJsonField,
  thumbnail_url: z.string().min(1).optional().or(z.literal('')).or(z.null()),
  background_color: ColorField,
  is_active: z.boolean().optional(),
}).strict();

/**
 * Schema for updating a template.
 * All fields optional — partial updates must not require full payload.
 */
export const UpdateTemplateSchema = CreateTemplateSchema.partial().strict();

export const TemplateThumbnailUploadFields = z.object({
  template_slug: SlugField.default('untitled'),
}).strict();
