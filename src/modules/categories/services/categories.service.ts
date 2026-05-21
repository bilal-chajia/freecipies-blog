/**
 * Categories Module - Database Service
 * ======================================
 * Database operations for categories.
 */

import { eq, and, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { categories, type Category, type NewCategory } from '../schema/categories.schema';
import { articles } from '../../articles/schema/articles.schema';
import { syncCachedFields } from '../../articles/services/articles.service';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';

async function getArticleIdsForCategory(drizzle: DrizzleDb, categoryId: number): Promise<number[]> {
  const rows = await drizzle
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.categoryId, categoryId), isNull(articles.deletedAt)));

  return rows.map((row) => row.id);
}

async function refreshCategoryArticleCaches(db: D1Database | DrizzleDb, articleIds: number[]): Promise<void> {
  for (const articleId of articleIds) {
    await syncCachedFields(db, articleId);
  }
}

/**
 * Get all categories
 */
export async function getCategories(
  db: D1Database | DrizzleDb,
  options?: { isOnline?: boolean; parentId?: number | null }
): Promise<Category[]> {
  const drizzle = getDb(db);

  const conditions = [isNull(categories.deletedAt)];

  if (options?.isOnline !== undefined) {
    conditions.push(eq(categories.isOnline, options.isOnline));
  }

  if (options?.parentId !== undefined) {
    if (options.parentId === null) {
      conditions.push(isNull(categories.parentId));
    } else {
      conditions.push(eq(categories.parentId, options.parentId));
    }
  }

  return await drizzle
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.sortOrder), asc(categories.label));
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(db: D1Database | DrizzleDb, slug: string): Promise<Category | null> {
  const drizzle = getDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.slug, slug), isNull(categories.deletedAt)),
  }) || null;
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(db: D1Database | DrizzleDb, id: number): Promise<Category | null> {
  const drizzle = getDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.id, id), isNull(categories.deletedAt)),
  }) || null;
}

/**
 * Calculate depth based on parentId
 * Returns 0 for root categories, parent.depth + 1 for child categories
 */
async function calculateDepth(db: D1Database | DrizzleDb, parentId: number | null | undefined): Promise<number> {
  if (!parentId) return 0;

  const parent = await getCategoryById(db, parentId);
  if (!parent) return 0;

  return (parent.depth || 0) + 1;
}

/**
 * Create a new category
 */
export async function createCategory(
  db: D1Database | DrizzleDb,
  category: NewCategory
): Promise<Category | null> {
  const drizzle = getDb(db);

  // Auto-calculate depth based on parentId
  const depth = await calculateDepth(db, category.parentId);

  const [inserted] = await drizzle.insert(categories).values({
    ...category,
    depth,
  }).returning();
  return inserted || null;
}

/**
 * Update a category
 */
export async function updateCategory(
  db: D1Database | DrizzleDb,
  slug: string,
  category: Partial<NewCategory>
): Promise<Category | null> {
  const drizzle = getDb(db);
  const existing = await getCategoryBySlug(db, slug);
  if (!existing) return null;
  const affectedArticleIds = await getArticleIdsForCategory(drizzle, existing.id);

  // Recalculate depth if parentId is being changed
  const depth = category.parentId !== undefined
    ? await calculateDepth(db, category.parentId)
    : undefined;

  const updateData = {
    ...category,
    ...(depth !== undefined ? { depth } : {}),
    updatedAt: new Date().toISOString(),
  };

  await drizzle.update(categories)
    .set(updateData)
    .where(eq(categories.slug, slug));

  await refreshCategoryArticleCaches(db, affectedArticleIds);

  return getCategoryBySlug(db, slug);
}

/**
 * Update a category by ID
 */
export async function updateCategoryById(
  db: D1Database | DrizzleDb,
  id: number,
  category: Partial<NewCategory>
): Promise<Category | null> {
  const drizzle = getDb(db);
  const existing = await getCategoryById(db, id);
  if (!existing) return null;
  const affectedArticleIds = await getArticleIdsForCategory(drizzle, id);

  // Recalculate depth if parentId is being changed
  const depth = category.parentId !== undefined
    ? await calculateDepth(db, category.parentId)
    : undefined;

  const updateData = {
    ...category,
    ...(depth !== undefined ? { depth } : {}),
    updatedAt: new Date().toISOString(),
  };

  await drizzle.update(categories)
    .set(updateData)
    .where(eq(categories.id, id));

  await refreshCategoryArticleCaches(db, affectedArticleIds);

  return getCategoryById(db, id);
}

/**
 * Soft delete a category
 */
export async function deleteCategory(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
  const drizzle = getDb(db);
  const result = await drizzle.update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(categories.slug, slug));
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Soft delete a category by ID
 */
export async function deleteCategoryById(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  const result = await drizzle.update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
  return (result.rowsAffected ?? 0) > 0;
}

