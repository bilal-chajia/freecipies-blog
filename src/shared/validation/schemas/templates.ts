/**
 * Templates Domain Zod Schemas
 * =============================
 * Validation schemas for template creation and update endpoints.
 */
import { z } from '../helpers';
import { SlugField, LabelField, DescriptionField } from './common';

/** JSON string or object (for elementsJson) */
const JsonField = z.union([z.string(), z.record(z.unknown()), z.array(z.unknown())]).optional();

/** Hex color string */
const ColorField = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Invalid hex color').optional();

/**
 * Schema for creating a template.
 * Uses .passthrough() to allow extra fields like snake_case variants
 * consumed by the service (e.g. elements_json, canvas_width, canvas_height).
 */
export const CreateTemplateSchema = z.object({
  slug: SlugField,
  name: LabelField,
  description: DescriptionField,
  category: z.string().max(100).optional(),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  elementsJson: JsonField,
  thumbnailUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  backgroundColor: ColorField,
  isActive: z.boolean().optional(),
}).passthrough();

/**
 * Schema for updating a template.
 * All fields are optional at the top level (partial).
 */
export const UpdateTemplateSchema = CreateTemplateSchema;
