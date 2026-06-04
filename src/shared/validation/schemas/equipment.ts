/**
 * Equipment Domain Zod Schemas
 * =============================
 * Validation schemas for equipment creation and update endpoints.
 */
import { z } from '../helpers';
import { SlugField, LabelField, DescriptionField } from './common';

/** JSON string or object (for keywords, image_json) */
const JsonField = z.union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional();

/**
 * Schema for creating equipment.
 * Uses .passthrough() to allow extra fields consumed by transformEquipmentRequestBody
 * (e.g. keywords as array, image_json as object).
 */
export const CreateEquipmentSchema = z.object({
  slug: SlugField,
  name: LabelField,
  brand: z.string().max(200).optional(),
  description: DescriptionField,
  keywords: JsonField,
  category: z.string().max(100).optional(),
  image_json: JsonField,
  affiliate_url: z.string().url().optional().or(z.literal('')),
  affiliate_provider: z.string().max(100).optional(),
  affiliate_note: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
}).passthrough();

/**
 * Schema for updating equipment.
 * All fields are optional at the top level (partial).
 */
export const UpdateEquipmentSchema = CreateEquipmentSchema;
