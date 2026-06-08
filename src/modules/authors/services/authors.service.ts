/**
 * Authors Module - Database Service
 * ===================================
 * Database operations for authors.
 */

import { eq, and, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { authors, type Author, type NewAuthor } from '../schema/authors.schema';
import { articles } from '../../articles/schema/articles.schema';
import { syncCachedFields } from '../../articles/services/articles.service';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';

async function getArticleIdsForAuthor(drizzle: DrizzleDb, author_id: number): Promise<number[]> {
  const rows = await drizzle
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.author_id, author_id), isNull(articles.deleted_at)));

  return rows.map((row) => row.id);
}

async function refreshAuthorArticleCaches(db: D1Database | DrizzleDb, articleIds: number[]): Promise<void> {
  for (const article_id of articleIds) {
    await syncCachedFields(db, article_id);
  }
}

/**
 * Get all authors
 */
export async function getAuthors(
  db: D1Database | DrizzleDb,
  options?: { workflow_status?: 'draft' | 'published' | 'archived' }
): Promise<Author[]> {
  const drizzle = getDb(db);

  const conditions = [isNull(authors.deleted_at)];
  if (options?.workflow_status !== undefined) {
    conditions.push(eq(authors.workflow_status, options.workflow_status));
  }

  return await drizzle
    .select()
    .from(authors)
    .where(and(...conditions))
    .orderBy(asc(authors.sort_order), asc(authors.name));
}

/**
 * Get a single author by slug
 */
export async function getAuthorBySlug(db: D1Database | DrizzleDb, slug: string): Promise<Author | null> {
  const drizzle = getDb(db);
  return await drizzle.query.authors.findFirst({
    where: and(eq(authors.slug, slug), isNull(authors.deleted_at)),
  }) || null;
}

/**
 * Get a single author by ID
 */
export async function getAuthorById(db: D1Database | DrizzleDb, id: number): Promise<Author | null> {
  const drizzle = getDb(db);
  return await drizzle.query.authors.findFirst({
    where: and(eq(authors.id, id), isNull(authors.deleted_at)),
  }) || null;
}

/**
 * Create a new author
 */
export async function createAuthor(
  db: D1Database | DrizzleDb,
  author: NewAuthor
): Promise<Author | null> {
  const drizzle = getDb(db);

  const [inserted] = await drizzle.insert(authors).values(author).returning();
  return inserted || null;
}

/**
 * Update an author
 */
export async function updateAuthor(
  db: D1Database | DrizzleDb,
  slug: string,
  author: Partial<NewAuthor>
): Promise<Author | null> {
  const drizzle = getDb(db);
  const existing = await getAuthorBySlug(db, slug);
  if (!existing) return null;
  const affectedArticleIds = await getArticleIdsForAuthor(drizzle, existing.id);

  const updateData = {
    ...author,
    updated_at: new Date().toISOString(),
  };

  await drizzle.update(authors)
    .set(updateData)
    .where(eq(authors.slug, slug));

  await refreshAuthorArticleCaches(db, affectedArticleIds);

  return getAuthorBySlug(db, slug);
}

/**
 * Soft delete an author
 */
export async function deleteAuthor(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.update(authors)
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(authors.slug, slug));
  return true;
}

/**
 * Update an author by ID
 */
export async function updateAuthorById(
  db: D1Database | DrizzleDb,
  id: number,
  author: Partial<NewAuthor>
): Promise<Author | null> {
  const drizzle = getDb(db);
  const existing = await getAuthorById(db, id);
  if (!existing) return null;
  const affectedArticleIds = await getArticleIdsForAuthor(drizzle, id);

  const updateData = {
    ...author,
    updated_at: new Date().toISOString(),
  };

  await drizzle.update(authors)
    .set(updateData)
    .where(eq(authors.id, id));

  await refreshAuthorArticleCaches(db, affectedArticleIds);

  return getAuthorById(db, id);
}

/**
 * Soft delete an author by ID
 */
export async function deleteAuthorById(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.update(authors)
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(authors.id, id));
  return true;
}



/**
 * Toggle is_featured status by ID
 */
export async function toggleFeaturedById(db: D1Database | DrizzleDb, id: number): Promise<Author | null> {
  const drizzle = getDb(db);

  const author = await getAuthorById(db, id);
  if (!author) return null;

  await drizzle.update(authors)
    .set({
      is_featured: !author.is_featured,
      updated_at: new Date().toISOString(),
    })
    .where(eq(authors.id, id));

  return getAuthorById(db, id);
}
