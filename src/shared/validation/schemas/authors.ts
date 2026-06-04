/**
 * Authors Domain Zod Schemas
 * ==========================
 * Validation schemas for author creation and update endpoints.
 */
import { z } from '../helpers';
import { SlugField } from './common';

/**
 * Schema for creating an author.
 * Uses .passthrough() to allow extra fields consumed by transformAuthorRequestBody.
 */
export const CreateAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: SlugField,
  email: z.string().email('Invalid email address').optional(),
  bio: z.string().max(5000).optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
  social_links: z.record(z.string(), z.string()).optional(),
  workflow_status: z.enum(['draft', 'published', 'archived']).optional(),
  sort_order: z.number().int().min(0).optional(),
  seo_json: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  config_json: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
}).passthrough();

/**
 * Schema for updating an author.
 * PATCH/PUT payloads from admin can contain a single changed field.
 */
export const UpdateAuthorSchema = CreateAuthorSchema.partial().passthrough();
