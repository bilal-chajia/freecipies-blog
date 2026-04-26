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
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  isOnline: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  seoJson: z.union([z.string(), z.record(z.unknown())]).optional(),
  configJson: z.union([z.string(), z.record(z.unknown())]).optional(),
}).passthrough();

/**
 * Schema for updating an author.
 * Same as create — transformAuthorRequestBody handles partial updates.
 */
export const UpdateAuthorSchema = CreateAuthorSchema;
