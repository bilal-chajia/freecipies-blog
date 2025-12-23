/**
 * Tags Module - Database Service
 * ================================
 * Database operations for tags.
 */

import { eq, and, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { tags, type Tag, type NewTag } from '../schema/tags.schema';
import { createDb } from '../../../shared/database/drizzle';

/**
 * Get all tags
 */
export async function getTags(
  db: D1Database,
  options?: { limit?: number; isOnline?: boolean }
): Promise<Tag[]> {
  const drizzle = createDb(db);

  const conditions = [isNull(tags.deletedAt)];

  if (options?.isOnline !== undefined) {
    conditions.push(eq(tags.isOnline, options.isOnline));
  }

  const query = drizzle
    .select()
    .from(tags)
    .where(and(...conditions))
    .orderBy(asc(tags.label));

  if (options?.limit) {
    return await query.limit(options.limit);
  }

  return await query;
}

/**
 * Get a single tag by slug
 */
export async function getTagBySlug(db: D1Database, slug: string): Promise<Tag | null> {
  const drizzle = createDb(db);
  return await drizzle.query.tags.findFirst({
    where: and(eq(tags.slug, slug), isNull(tags.deletedAt)),
  }) || null;
}

/**
 * Create a new tag
 */
export async function createTag(
  db: D1Database,
  tag: NewTag
): Promise<Tag | null> {
  const drizzle = createDb(db);

  const [inserted] = await drizzle.insert(tags).values(tag).returning();
  return inserted || null;
}

/**
 * Update a tag
 */
export async function updateTag(
  db: D1Database,
  slug: string,
  tag: Partial<NewTag>
): Promise<Tag | null> {
  const drizzle = createDb(db);

  const updateData = {
    ...tag,
    updatedAt: new Date().toISOString(),
  };

  await drizzle.update(tags)
    .set(updateData)
    .where(eq(tags.slug, slug));

  return getTagBySlug(db, slug);
}

/**
 * Soft delete a tag
 */
export async function deleteTag(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(tags)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(tags.slug, slug));
  return true;
}
