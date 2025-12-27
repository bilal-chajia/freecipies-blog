/**
 * Categories Module - Database Service
 * ======================================
 * Database operations for categories.
 */

import { eq, and, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { categories, type Category, type NewCategory } from '../schema/categories.schema';
import { createDb } from '../../../shared/database/drizzle';

/**
 * Get all categories
 */
export async function getCategories(
  db: D1Database,
  options?: { isOnline?: boolean; parentId?: number | null }
): Promise<Category[]> {
  const drizzle = createDb(db);

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
export async function getCategoryBySlug(db: D1Database, slug: string): Promise<Category | null> {
  const drizzle = createDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.slug, slug), isNull(categories.deletedAt)),
  }) || null;
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(db: D1Database, id: number): Promise<Category | null> {
  const drizzle = createDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.id, id), isNull(categories.deletedAt)),
  }) || null;
}

/**
 * Calculate depth based on parentId
 * Returns 0 for root categories, parent.depth + 1 for child categories
 */
async function calculateDepth(db: D1Database, parentId: number | null | undefined): Promise<number> {
  if (!parentId) return 0;

  const parent = await getCategoryById(db, parentId);
  if (!parent) return 0;

  return (parent.depth || 0) + 1;
}

/**
 * Create a new category
 */
export async function createCategory(
  db: D1Database,
  category: NewCategory
): Promise<Category | null> {
  const drizzle = createDb(db);

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
  db: D1Database,
  slug: string,
  category: Partial<NewCategory>
): Promise<Category | null> {
  const drizzle = createDb(db);

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

  return getCategoryBySlug(db, slug);
}

/**
 * Update a category by ID
 */
export async function updateCategoryById(
  db: D1Database,
  id: number,
  category: Partial<NewCategory>
): Promise<Category | null> {
  const drizzle = createDb(db);

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

  return getCategoryById(db, id);
}

/**
 * Soft delete a category
 */
export async function deleteCategory(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  const result = await drizzle.update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(categories.slug, slug));
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Soft delete a category by ID
 */
export async function deleteCategoryById(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  const result = await drizzle.update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
  return (result.rowsAffected ?? 0) > 0;
}
