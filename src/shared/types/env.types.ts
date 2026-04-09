/**
 * Shared Types - Environment Types
 * ==================================
 * Cloudflare environment bindings.
 */

import type { D1Database, R2Bucket, KVNamespace, ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  SESSION: KVNamespace;
  R2_PUBLIC_URL: string;
  SITE_URL: string;
  JWT_SECRET: string;
  ENVIRONMENT?: 'development' | 'production';
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

// Astro v6: runtime.env is removed from locals.
// Use `import { env } from 'cloudflare:workers'` instead.
export interface AstroLocals {
  cfContext: ExecutionContext;
}
