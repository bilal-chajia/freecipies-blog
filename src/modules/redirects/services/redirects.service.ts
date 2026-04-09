/**
 * Redirects Module - Database Service
 * =====================================
 * Database operations for redirects.
 */

import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { redirects, type Redirect, type NewRedirect } from '../schema/redirects.schema';
import { createDb, getDb, type DrizzleDb } from '../../../shared/database/drizzle';
import type { RedirectFilter } from '../types/redirects.types';

/**
 * Get all redirects with optional filtering
 */
export async function getRedirects(
  db: D1Database | DrizzleDb,
  filter?: RedirectFilter
): Promise<Redirect[]> {
  const drizzle = getDb(db);

  const conditions = [];

  if (filter?.isActive !== undefined) {
    conditions.push(eq(redirects.isActive, filter.isActive));
  }

  if (filter?.search) {
    const searchPattern = `%${filter.search}%`;
    conditions.push(
      or(
        like(redirects.fromPath, searchPattern),
        like(redirects.toPath, searchPattern),
        like(redirects.notes, searchPattern)
      )
    );
  }

  return await drizzle
    .select()
    .from(redirects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(redirects.createdAt));
}

/**
 * Get a redirect by its source path (for middleware)
 */
export async function getRedirectByFromPath(db: D1Database | DrizzleDb, fromPath: string): Promise<Redirect | null> {
  const drizzle = getDb(db);
  const result = await drizzle
    .select()
    .from(redirects)
    .where(and(eq(redirects.fromPath, fromPath), eq(redirects.isActive, true)))
    .limit(1);

  return result[0] || null;
}

/**
 * Get a redirect by ID
 */
export async function getRedirectById(db: D1Database | DrizzleDb, id: number): Promise<Redirect | null> {
  const drizzle = getDb(db);
  const result = await drizzle
    .select()
    .from(redirects)
    .where(eq(redirects.id, id))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a new redirect
 */
export async function createRedirect(db: D1Database | DrizzleDb, data: NewRedirect): Promise<Redirect> {
  const drizzle = getDb(db);
  const [inserted] = await drizzle.insert(redirects).values(data).returning();
  return inserted;
}

/**
 * Update an existing redirect
 */
export async function updateRedirect(
  db: D1Database | DrizzleDb,
  id: number,
  data: Partial<NewRedirect>
): Promise<Redirect | null> {
  const drizzle = getDb(db);

  await drizzle
    .update(redirects)
    .set({
      ...data,
      updatedAt: new Date().toISOString()
    })
    .where(eq(redirects.id, id));

  return await getRedirectById(db, id);
}

/**
 * Delete a redirect (hard delete)
 */
export async function deleteRedirect(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.delete(redirects).where(eq(redirects.id, id));
  return true;
}

/**
 * Increment hit count and update last hit timestamp
 */
export async function incrementHitCount(db: D1Database | DrizzleDb, id: number): Promise<void> {
  const drizzle = getDb(db);
  await drizzle
    .update(redirects)
    .set({
      hitCount: sql`${redirects.hitCount} + 1`,
      lastHitAt: new Date().toISOString()
    })
    .where(eq(redirects.id, id));
}
