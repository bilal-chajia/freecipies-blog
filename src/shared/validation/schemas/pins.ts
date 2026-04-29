/**
 * Pinterest Pins & Boards Zod Schemas
 * =====================================
 * Validation schemas for pin and board CRUD API endpoints.
 */
import { z } from '../helpers';
import { SlugField } from './common';

// ─── Pin Query Schemas ───────────────────────────────────────────────

/** Query params for GET /api/pins — requires article_id */
export const PinListQuery = z.object({
  article_id: z.coerce.number().int().positive('article_id must be a positive integer'),
});

/** Query params for DELETE /api/pins — requires id */
export const PinDeleteQuery = z.object({
  id: z.coerce.number().int().positive('Pin ID must be a positive integer'),
});

// ─── Pin Body Schemas ────────────────────────────────────────────────

/** Body for POST /api/pins — create a new pin */
export const CreatePinSchema = z.object({
  article_id: z.coerce.number().int().positive('article_id must be a positive integer'),
  board_id: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  image_url: z.string().min(1, 'Image URL is required'),
  pin_url: z.string().optional(),
}).passthrough();

/** Body for PUT /api/pins — update an existing pin */
export const UpdatePinSchema = z.object({
  id: z.coerce.number().int().positive('Pin ID is required'),
  board_id: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  pin_url: z.string().optional(),
}).passthrough();

// ─── Board Schemas ───────────────────────────────────────────────────

/** Query params for GET /api/pinterest-boards — optional slug filter */
export const BoardGetQuery = z.object({
  slug: z.string().min(1).optional(),
});

/** Query params for DELETE /api/pinterest-boards — requires id */
export const BoardDeleteQuery = z.object({
  id: z.coerce.number().int().positive('Board ID must be a positive integer'),
});

/** Body for POST /api/pinterest-boards — create a new board */
export const CreatePinterestBoardSchema = z.object({
  slug: SlugField,
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  board_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  is_active: z.boolean().optional(),
}).passthrough();

/** Body for PUT /api/pinterest-boards — update an existing board */
export const UpdatePinterestBoardSchema = z.object({
  id: z.coerce.number().int().positive('Board ID is required'),
  slug: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  board_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  is_active: z.boolean().optional(),
}).passthrough();
