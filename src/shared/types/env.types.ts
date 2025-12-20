/**
 * Shared Types - Environment Types
 * ==================================
 * Cloudflare environment bindings.
 */

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  R2_PUBLIC_URL: string;
  JWT_SECRET: string;
  ENVIRONMENT?: 'development' | 'production';
}

// Astro locals type extension
export interface AstroLocals {
  runtime: {
    env: Env;
  };
}
