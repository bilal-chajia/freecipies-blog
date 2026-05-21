/**
 * Tags Module - Database Service
 * ================================
 * Database operations for tags.
 */

import { eq, and, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { tags, type Tag, type NewTag } from '../schema/tags.schema';
import { articlesToTags } from '../../articles/schema/articles-to-tags.schema';
import { articles } from '../../articles/schema/articles.schema';
import { syncCachedFields } from '../../articles/services/articles.service';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';

async function getArticleIdsForTag(drizzle: DrizzleDb, tagId: number): Promise<number[]> {
  const rows = await drizzle
    .select({ id: articles.id })
    .from(articlesToTags)
    .innerJoin(articles, eq(articlesToTags.articleId, articles.id))
    .where(and(eq(articlesToTags.tagId, tagId), isNull(articles.deletedAt)));

  return rows.map((row) => row.id);
}

async function refreshTagArticleCaches(db: D1Database | DrizzleDb, articleIds: number[]): Promise<void> {
  for (const articleId of articleIds) {
    await syncCachedFields(db, articleId);
  }
}

/**
 * Get all tags
 */
export async function getTags(
  db: D1Database | DrizzleDb,
  options?: { limit?: number }
): Promise<Tag[]> {
  const drizzle = getDb(db);

  const conditions = [isNull(tags.deletedAt)];

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
export async function getTagBySlug(db: D1Database | DrizzleDb, slug: string): Promise<Tag | null> {
  const drizzle = getDb(db);
  return await drizzle.query.tags.findFirst({
    where: and(eq(tags.slug, slug), isNull(tags.deletedAt)),
  }) || null;
}

/**
 * Create a new tag
 */
export async function createTag(
  db: D1Database | DrizzleDb,
  tag: NewTag
): Promise<Tag | null> {
  const drizzle = getDb(db);

  const [inserted] = await drizzle.insert(tags).values(tag).returning();
  return inserted || null;
}

/**
 * Update a tag
 */
export async function updateTag(
  db: D1Database | DrizzleDb,
  slug: string,
  tag: Partial<NewTag>
): Promise<Tag | null> {
  const drizzle = getDb(db);
  const existing = await getTagBySlug(db, slug);
  if (!existing) return null;
  const affectedArticleIds = await getArticleIdsForTag(drizzle, existing.id);

  const updateData = {
    ...tag,
    updatedAt: new Date().toISOString(),
  };

  await drizzle.update(tags)
    .set(updateData)
    .where(eq(tags.slug, slug));

  await refreshTagArticleCaches(db, affectedArticleIds);

  return getTagBySlug(db, slug);
}

/**
 * Soft delete a tag
 */
export async function deleteTag(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
  const drizzle = getDb(db);
  const existing = await getTagBySlug(db, slug);
  if (!existing) return false;
  const affectedArticleIds = await getArticleIdsForTag(drizzle, existing.id);

  await drizzle.update(tags)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(tags.slug, slug));
  await refreshTagArticleCaches(db, affectedArticleIds);

  return true;
}
