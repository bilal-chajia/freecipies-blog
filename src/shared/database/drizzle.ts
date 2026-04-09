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

/**
 * Normalize input to Drizzle instance.
 * Accepts either a D1Database binding or an existing DrizzleDb instance.
 * This ensures per-request database instances to avoid cross-request promise issues.
 */
export function getDb(input: D1Database | DrizzleDb): DrizzleDb {
    // If it's already a DrizzleDb instance (has the query method), return as-is
    if ('query' in input && typeof input.query === 'object') {
        return input as DrizzleDb;
    }
    // Otherwise, create a new Drizzle instance from the D1 binding
    return createDb(input as D1Database);
}
