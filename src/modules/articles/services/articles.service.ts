/**
 * Articles Module - Database Service
 * ====================================
 * Database operations for articles.
 */

import { eq, and, or, like, desc, asc, isNull, inArray, sql } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { articles, type Article, type NewArticle } from '../schema/articles.schema';
import { createDb } from '../../../shared/database/drizzle';

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
}

export interface PaginatedArticles {
  items: Article[];
  total: number;
}

/**
 * Get articles with filtering and pagination
 */
import { getTableColumns } from 'drizzle-orm';
import { categories } from '../../categories/schema/categories.schema';
import { authors } from '../../authors/schema/authors.schema';

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

  const items = await drizzle
    .select({
      ...getTableColumns(articles),
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      authorName: authors.name,
      authorSlug: authors.slug,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(whereClause)
    .orderBy(desc(articles.publishedAt))
    .limit(options?.limit || 100)
    .offset(options?.offset || 0);

  const [{ count: total }] = await drizzle
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(whereClause);

  return {
    items: items as Article[], // Cast to Article compatibility (HydratedArticle expects these optional fields)
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
): Promise<Article | null> {
  const drizzle = createDb(db);

  const conditions = [eq(articles.slug, slug), isNull(articles.deletedAt)];
  if (type) {
    conditions.push(eq(articles.type, type));
  }

  const result = await drizzle.query.articles.findFirst({
    where: and(...conditions),
  });

  return result || null;
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
