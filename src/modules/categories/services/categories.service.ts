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
 * Create a new category
 */
export async function createCategory(
  db: D1Database,
  category: NewCategory
): Promise<Category | null> {
  const drizzle = createDb(db);

  const [inserted] = await drizzle.insert(categories).values(category).returning();
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

  const updateData = {
    ...category,
    updatedAt: new Date().toISOString(),
  };

  await drizzle.update(categories)
    .set(updateData)
    .where(eq(categories.slug, slug));

  return getCategoryBySlug(db, slug);
}

/**
 * Soft delete a category
 */
export async function deleteCategory(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(categories.slug, slug));
  return true;
}
