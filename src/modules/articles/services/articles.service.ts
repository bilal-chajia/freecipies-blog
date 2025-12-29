/**
 * Articles Module - Database Service
 * ====================================
 * Database operations for articles.
 */

import { eq, and, or, like, desc, asc, isNull, sql } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { getTableColumns } from 'drizzle-orm';
import { articles, type Article, type NewArticle } from '../schema/articles.schema';
import { categories } from '../../categories/schema/categories.schema';
import { authors } from '../../authors/schema/authors.schema';
import { createDb } from '../../../shared/database/drizzle';
import { hydrateArticle, hydrateArticles, type HydratedArticle } from '../../../shared/utils/hydration';

export interface ArticleQueryOptions {
  categoryId?: number;
  authorId?: number;
  categorySlug?: string;
  authorSlug?: string;
  tagSlug?: string;
  limit?: number;
  offset?: number;
  type?: 'recipe' | 'article' | 'roundup';
  publishedAfter?: Date;
  isOnline?: boolean;
  search?: string;
  sortBy?: 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedArticles {
  items: HydratedArticle[];
  total: number;
}

/**
 * Get articles with filtering and pagination
 */
export async function getArticles(
  db: D1Database,
  options?: ArticleQueryOptions
): Promise<PaginatedArticles> {
  const drizzle = createDb(db);

  const conditions: any[] = [];

  // Filter soft-deleted
  conditions.push(isNull(articles.deletedAt));

  if (options?.isOnline === true) {
    conditions.push(eq(articles.isOnline, true));
  }

  if (options?.type) {
    conditions.push(eq(articles.type, options.type));
  }

  if (options?.categoryId) {
    conditions.push(eq(articles.categoryId, options.categoryId));
  }

  if (options?.authorId) {
    conditions.push(eq(articles.authorId, options.authorId));
  }

  // Support filtering by slug relations if IDs not provided
  if (options?.categorySlug && !options.categoryId) {
    conditions.push(eq(categories.slug, options.categorySlug));
  }

  if (options?.authorSlug && !options.authorId) {
    conditions.push(eq(authors.slug, options.authorSlug));
  }

  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(articles.headline, searchPattern),
        like(articles.shortDescription, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Dynamic sorting based on options
  const sortColumn = options?.sortBy === 'title'
    ? articles.headline
    : options?.sortBy === 'viewCount'
      ? articles.viewCount
      : articles.publishedAt;
  const orderByClause = options?.sortOrder === 'asc'
    ? asc(sortColumn)
    : desc(sortColumn);

  const items = await drizzle
    .select({
      ...getTableColumns(articles),
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      authorName: authors.name,
      authorSlug: authors.slug,
      authorImagesJson: authors.imagesJson,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(options?.limit || 100)
    .offset(options?.offset || 0);

  const [{ count: total }] = await drizzle
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(whereClause);

  return {
    items: hydrateArticles(items as any[]),
    total: Number(total),
  };
}

/**
 * Get a single article by slug
 */
export async function getArticleBySlug(
  db: D1Database,
  slug: string,
  type?: 'recipe' | 'article' | 'roundup'
): Promise<HydratedArticle | null> {
  const drizzle = createDb(db);

  const conditions = [eq(articles.slug, slug), isNull(articles.deletedAt)];
  if (type) {
    conditions.push(eq(articles.type, type));
  }

  const result = await drizzle.query.articles.findFirst({
    where: and(...conditions),
  });

  return result ? hydrateArticle(result) : null;
}

/**
 * Create a new article
 */
export async function createArticle(
  db: D1Database,
  article: NewArticle
): Promise<Article | null> {
  const drizzle = createDb(db);

  const [inserted] = await drizzle.insert(articles).values(article).returning();
  return inserted || null;
}

/**
 * Update an article
 */
export async function updateArticle(
  db: D1Database,
  slug: string,
  article: Partial<NewArticle>
): Promise<boolean> {
  const drizzle = createDb(db);

  const updateData = {
    ...article,
    updatedAt: new Date().toISOString(),
  };

  await drizzle.update(articles)
    .set(updateData)
    .where(eq(articles.slug, slug));

  return true;
}

/**
 * Soft delete an article
 */
export async function deleteArticle(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(articles)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(articles.slug, slug));
  return true;
}

/**
 * Increment view count
 */
export async function incrementViewCount(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.slug, slug));
  return true;
}

// ============================================
// ID-BASED FUNCTIONS (Admin Mutations)
// ============================================

/**
 * Get a single article by ID (for admin operations)
 */
export async function getArticleById(
  db: D1Database,
  id: number
): Promise<HydratedArticle | null> {
  const drizzle = createDb(db);

  const result = await drizzle
    .select({
      ...getTableColumns(articles),
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      authorName: authors.name,
      authorSlug: authors.slug,
      authorImagesJson: authors.imagesJson,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .get();

  return result ? hydrateArticle(result) : null;
}

/**
 * Update an article by ID (admin mutations)
 */
export async function updateArticleById(
  db: D1Database,
  id: number,
  patch: Partial<NewArticle>
): Promise<boolean> {
  const drizzle = createDb(db);

  // Stringify JSON fields if they are objects
  const processedPatch = { ...patch } as Record<string, unknown>;
  const jsonFields = [
    'imagesJson', 'contentJson', 'recipeJson', 'roundupJson',
    'faqsJson', 'seoJson', 'configJson', 'jsonldJson',
    'relatedArticlesJson', 'cachedTagsJson', 'cachedCategoryJson',
    'cachedAuthorJson', 'cachedEquipmentJson', 'cachedRatingJson',
    'cachedTocJson', 'cachedRecipeJson', 'cachedCardJson'
  ];

  for (const field of jsonFields) {
    if (field in processedPatch && processedPatch[field] !== undefined) {
      const value = processedPatch[field];
      if (typeof value === 'object' && value !== null) {
        processedPatch[field] = JSON.stringify(value);
      }
    }
  }

  const updateData = {
    ...processedPatch,
    updatedAt: new Date().toISOString(),
  };

  const result = await drizzle.update(articles)
    .set(updateData)
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .returning({ id: articles.id });

  return result.length > 0;
}

/**
 * Soft delete an article by ID
 */
export async function deleteArticleById(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);

  const result = await drizzle.update(articles)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .returning({ id: articles.id });

  return result.length > 0;
}

/**
 * Toggle online status by ID
 */
export async function toggleOnlineById(db: D1Database, id: number): Promise<{ isOnline: boolean } | null> {
  const drizzle = createDb(db);

  const current = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deletedAt)),
    columns: { isOnline: true }
  });

  if (!current) return null;

  const newValue = !current.isOnline;

  await drizzle.update(articles)
    .set({ isOnline: newValue, updatedAt: new Date().toISOString() })
    .where(eq(articles.id, id));

  return { isOnline: newValue };
}

/**
 * Toggle favorite status by ID
 */
export async function toggleFavoriteById(db: D1Database, id: number): Promise<{ isFavorite: boolean } | null> {
  const drizzle = createDb(db);

  const current = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deletedAt)),
    columns: { isFavorite: true }
  });

  if (!current) return null;

  const newValue = !current.isFavorite;

  await drizzle.update(articles)
    .set({ isFavorite: newValue, updatedAt: new Date().toISOString() })
    .where(eq(articles.id, id));

  return { isFavorite: newValue };
}

/**
 * Synchronize cached JSON fields for an article
 * Populates optimized fields like cachedAuthorJson and cachedCategoryJson
 */
export async function syncCachedFields(
  db: D1Database,
  id: number
): Promise<boolean> {
  const drizzle = createDb(db);

  const article = await drizzle
    .select({
      ...getTableColumns(articles),
      authorName: authors.name,
      authorSlug: authors.slug,
      authorAvatar: authors.imagesJson,
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(articles)
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.id, id))
    .get();

  if (!article) return false;

  const updateData: Partial<Article> = {};

  if (article.authorId) {
    const hydrator = hydrateArticle(article as any);
    updateData.cachedAuthorJson = JSON.stringify({
      name: article.authorName,
      slug: article.authorSlug,
      avatar: hydrator.authorAvatar || null,
    });
  }

  if (article.categoryId) {
    updateData.cachedCategoryJson = JSON.stringify({
      label: article.categoryLabel,
      slug: article.categorySlug,
      color: article.categoryColor,
    });
  }

  await drizzle.update(articles)
    .set(updateData)
    .where(eq(articles.id, id));

  return true;
}
