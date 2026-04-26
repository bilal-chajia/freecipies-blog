/**
 * Auth Zod Schemas
 * ================
 * Validation schemas for authentication endpoints.
 */
import { z } from '../helpers';

/** Login request body — username + password required */
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/** Refresh request body — token required */
export const RefreshSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
