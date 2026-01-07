/**
 * Articles Module - Database Service
 * ====================================
 * Database operations for articles.
 */

import { eq, and, or, like, desc, asc, isNull, sql, inArray } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { getTableColumns } from 'drizzle-orm';
import { articles, type Article, type NewArticle } from '../schema/articles.schema';
import { articlesToTags } from '../schema/articles-to-tags.schema';
import { categories } from '../../categories/schema/categories.schema';
import { authors } from '../../authors/schema/authors.schema';
import { tags as tagsTable } from '../../tags/schema/tags.schema';
import { createDb } from '../../../shared/database/drizzle';
import { hydrateArticle, hydrateArticles, hydrateTag, type HydratedArticle, type HydratedTag } from '../../../shared/utils/hydration';

async function getTagsForArticleId(drizzle: any, articleId: number): Promise<HydratedTag[]> {
  const rows = await drizzle
    .select({ ...getTableColumns(tagsTable) })
    .from(articlesToTags)
    .innerJoin(tagsTable, eq(articlesToTags.tagId, tagsTable.id))
    .where(and(eq(articlesToTags.articleId, articleId), isNull(tagsTable.deletedAt)))
    .orderBy(asc(tagsTable.label));

  return rows.map(hydrateTag);
}

export async function setArticleTagsById(
  db: D1Database,
  articleId: number,
  tagIds: number[]
): Promise<HydratedTag[]> {
  const drizzle = createDb(db);
  const uniqueTagIds = Array.from(new Set(tagIds.filter((id) => Number.isFinite(id) && id > 0)));

  // Resolve to existing (non-deleted) tags only (prevents FK failures + keeps cache clean)
  const resolvedTags = uniqueTagIds.length
    ? await drizzle
      .select({ id: tagsTable.id, label: tagsTable.label })
      .from(tagsTable)
      .where(and(inArray(tagsTable.id, uniqueTagIds), isNull(tagsTable.deletedAt)))
    : [];

  // Replace join rows
  await drizzle.delete(articlesToTags).where(eq(articlesToTags.articleId, articleId));
  if (resolvedTags.length) {
    await drizzle.insert(articlesToTags).values(
      resolvedTags.map((tag) => ({ articleId, tagId: tag.id }))
    );
  }

  // Update zero-join cache (used by search indexing + UI)
  const cachedTagsJson = JSON.stringify(resolvedTags.map((tag) => tag.label));
  await drizzle.update(articles)
    .set({ cachedTagsJson, updatedAt: new Date().toISOString() })
    .where(eq(articles.id, articleId));

  return getTagsForArticleId(drizzle, articleId);
}

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

  if (options?.tagSlug) {
    conditions.push(sql`exists(
      select 1
      from ${articlesToTags}
      inner join ${tagsTable} on ${tagsTable.id} = ${articlesToTags.tagId}
      where ${articlesToTags.articleId} = ${articles.id}
        and ${tagsTable.slug} = ${options.tagSlug}
        and ${tagsTable.deletedAt} is null
    )`);
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

  if (!result) return null;

  const hydrated = hydrateArticle(result);
  const articleTags = await getTagsForArticleId(drizzle, (result as any).id);
  return { ...hydrated, tags: articleTags } as any;
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

  if (!result) return null;

  const hydrated = hydrateArticle(result);
  const articleTags = await getTagsForArticleId(drizzle, id);
  return { ...hydrated, tags: articleTags } as any;
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
    'cachedTagsJson', 'cachedCategoryJson',
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
