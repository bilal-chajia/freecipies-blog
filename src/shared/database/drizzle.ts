/**
 * Shared Database - Drizzle Client
 * ==================================
 * Central database client using Drizzle ORM.
 */

import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

// Create a Drizzle database instance from D1
export function createDb(d1: D1Database) {
    return drizzle(d1, { schema });
}

// Type for the Drizzle database instance
export type DrizzleDb = ReturnType<typeof createDb>;

// Re-export schema for convenience
export * from './schema';
