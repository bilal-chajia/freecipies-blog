/**
 * Tags Domain Zod Schemas
 * ========================
 * Validation schemas for tag creation and update endpoints.
 */
import { z } from '../helpers';
import { SlugField, LabelField, DescriptionField } from './common';

/** Hex color regex: #RGB, #RRGGBB, #RRGGBBAA (case-insensitive) */
const HexColorField = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Color must be a valid hex code').optional();

/** JSON string or object */
const JsonField = z.union([z.string(), z.record(z.unknown())]).optional();

/**
 * Schema for creating a tag.
 * Uses .passthrough() to allow extra fields consumed by transformTagRequestBody
 * (e.g. color, svg_code, svgCode, icon, variant, styleJson).
 */
export const CreateTagSchema = z.object({
  slug: SlugField,
  label: LabelField,
  shortDescription: DescriptionField,
  color: HexColorField,
  isOnline: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  seoJson: JsonField,
  configJson: JsonField,
}).passthrough();

/**
 * Schema for updating a tag.
 * All fields are optional at the top level (partial).
 * Uses .passthrough() for the same reason as CreateTagSchema.
 */
export const UpdateTagSchema = CreateTagSchema;
