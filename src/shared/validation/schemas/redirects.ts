/**
 * Redirect Zod Schemas
 * ====================
 * Validation schemas for redirect create/update API endpoints.
 */
import { z } from '../helpers';

/** Path field: non-empty string that must start with '/' */
const PathField = z.string().min(1, 'Path is required').startsWith('/', 'Path must start with "/"');

/** Target field: non-empty string that is a URL or starts with '/' */
const TargetField = z
  .string()
  .min(1, 'Target path is required')
  .refine(
    (val) => val.startsWith('/') || /^https?:\/\//i.test(val),
    'Target must be a valid URL or start with "/"',
  );

/** HTTP redirect status code */
const StatusCodeField = z.coerce
  .number()
  .int()
  .refine((val) => val === 301 || val === 302, 'Status code must be 301 or 302');

export const CreateRedirectSchema = z
  .object({
    fromPath: PathField,
    toPath: TargetField,
    statusCode: StatusCodeField.optional(),
    isActive: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  })
  .passthrough();

export const UpdateRedirectSchema = CreateRedirectSchema.partial().passthrough();
