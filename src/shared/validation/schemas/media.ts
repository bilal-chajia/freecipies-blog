/**
 * Media & Upload Zod Schemas
 * ==========================
 * Schemas for upload, proxy, and media-related API endpoints.
 */
import { z } from '../helpers';

/** Body for POST /api/upload-from-url — accepts imageUrl OR url as the source */
export const UploadFromUrlSchema = z.object({
  imageUrl: z.string().url('Invalid URL').optional(),
  url: z.string().url('Invalid URL').optional(),
  alt: z.string().optional(),
  attribution: z.string().optional(),
  caption: z.string().optional(),
}).refine(
  (data) => data.imageUrl || data.url,
  { message: 'No URL provided', path: ['url'] },
);

/** Query params for GET /api/proxy-image */
export const ProxyImageQuery = z.object({
  url: z.string().url('A valid URL is required'),
  width: z.coerce.number().int().min(1).max(4000).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
});
