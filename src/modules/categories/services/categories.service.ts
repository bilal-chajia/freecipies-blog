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

async function getArticleIdsForCategory(drizzle: DrizzleDb, category_id: number): Promise<number[]> {
  const rows = await drizzle
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.category_id, category_id), isNull(articles.deleted_at)));

  return rows.map((row) => row.id);
}

async function refreshCategoryArticleCaches(db: D1Database | DrizzleDb, articleIds: number[]): Promise<void> {
  for (const article_id of articleIds) {
    await syncCachedFields(db, article_id);
  }
}

/**
 * Get all categories
 */
export async function getCategories(
  db: D1Database | DrizzleDb,
  options?: { workflow_status?: 'draft' | 'published' | 'archived'; parent_id?: number | null }
): Promise<Category[]> {
  const drizzle = getDb(db);

  const conditions = [isNull(categories.deleted_at)];

  if (options?.workflow_status !== undefined) {
    conditions.push(eq(categories.workflow_status, options.workflow_status));
  }

  if (options?.parent_id !== undefined) {
    if (options.parent_id === null) {
      conditions.push(isNull(categories.parent_id));
    } else {
      conditions.push(eq(categories.parent_id, options.parent_id));
    }
  }

  return await drizzle
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.sort_order), asc(categories.label));
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(db: D1Database | DrizzleDb, slug: string): Promise<Category | null> {
  const drizzle = getDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.slug, slug), isNull(categories.deleted_at)),
  }) || null;
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(db: D1Database | DrizzleDb, id: number): Promise<Category | null> {
  const drizzle = getDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.id, id), isNull(categories.deleted_at)),
  }) || null;
}

/**
 * Returns true if setting `categoryId`'s parent to `newParentId` would create a cycle.
 * Pure: walks the parent chain via the injected resolver. Guards against
 * pre-existing loops with a visited set.
 */
export async function wouldCreateParentCycle(
  categoryId: number,
  newParentId: number | null | undefined,
  getParentId: (id: number) => Promise<number | null>,
): Promise<boolean> {
  if (newParentId === null || newParentId === undefined) return false;
  let currentId: number | null = newParentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    currentId = await getParentId(currentId);
  }
  return false;
}

/**
 * Calculate depth based on parent_id
 * Returns 0 for root categories, parent.depth + 1 for child categories
 */
async function calculateDepth(db: D1Database | DrizzleDb, parent_id: number | null | undefined): Promise<number> {
  if (!parent_id) return 0;

  const parent = await getCategoryById(db, parent_id);
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

  // Auto-calculate depth based on parent_id
  const depth = await calculateDepth(db, category.parent_id);

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

  if (category.parent_id !== undefined) {
    const cycle = await wouldCreateParentCycle(
      existing.id,
      category.parent_id,
      async (id) => (await getCategoryById(db, id))?.parent_id ?? null,
    );
    if (cycle) {
      const error = new Error('parent_id would create a category cycle');
      (error as { code?: string }).code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  const affectedArticleIds = await getArticleIdsForCategory(drizzle, existing.id);

  // Recalculate depth if parent_id is being changed
  const depth = category.parent_id !== undefined
    ? await calculateDepth(db, category.parent_id)
    : undefined;

  const updateData = {
    ...category,
    ...(depth !== undefined ? { depth } : {}),
    updated_at: new Date().toISOString(),
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

  if (category.parent_id !== undefined) {
    const cycle = await wouldCreateParentCycle(
      id,
      category.parent_id,
      async (cid) => (await getCategoryById(db, cid))?.parent_id ?? null,
    );
    if (cycle) {
      const error = new Error('parent_id would create a category cycle');
      (error as { code?: string }).code = 'VALIDATION_ERROR';
      throw error;
    }
  }

  const affectedArticleIds = await getArticleIdsForCategory(drizzle, id);

  // Recalculate depth if parent_id is being changed
  const depth = category.parent_id !== undefined
    ? await calculateDepth(db, category.parent_id)
    : undefined;

  const updateData = {
    ...category,
    ...(depth !== undefined ? { depth } : {}),
    updated_at: new Date().toISOString(),
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
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(categories.slug, slug));
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Soft delete a category by ID
 */
export async function deleteCategoryById(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  const result = await drizzle.update(categories)
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(categories.id, id));
  return (result.rowsAffected ?? 0) > 0;
}
