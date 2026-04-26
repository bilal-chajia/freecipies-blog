/**
 * Equipment Domain Zod Schemas
 * =============================
 * Validation schemas for equipment creation and update endpoints.
 */
import { z } from '../helpers';
import { SlugField, LabelField, DescriptionField } from './common';

/** JSON string or object (for keywords, imageJson) */
const JsonField = z.union([z.string(), z.record(z.unknown()), z.array(z.unknown())]).optional();

/**
 * Schema for creating equipment.
 * Uses .passthrough() to allow extra fields consumed by transformEquipmentRequestBody
 * (e.g. keywords as array, imageJson as object).
 */
export const CreateEquipmentSchema = z.object({
  slug: SlugField,
  name: LabelField,
  brand: z.string().max(200).optional(),
  description: DescriptionField,
  keywords: JsonField,
  category: z.string().max(100).optional(),
  imageJson: JsonField,
  affiliateUrl: z.string().url().optional().or(z.literal('')),
  affiliateProvider: z.string().max(100).optional(),
  affiliateNote: z.string().max(1000).optional(),
  priceDisplay: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).passthrough();

/**
 * Schema for updating equipment.
 * All fields are optional at the top level (partial).
 */
export const UpdateEquipmentSchema = CreateEquipmentSchema;
