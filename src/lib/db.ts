/**
 * Database Operations Layer (Drizzle ORM)
 * =======================================
 * 
 * This module provides all database CRUD operations for the application.
 * All queries use Drizzle ORM and must align with schema.ts definitions.
 * 
 * Key Functions:
 * - Articles: getArticles, getArticleBySlug, createArticle, updateArticle, deleteArticle
 * - Categories: getCategories, getCategoryBySlug, createCategory, updateCategory, deleteCategory
 * - Authors: getAuthors, getAuthorBySlug, createAuthor, updateAuthor, deleteAuthor
 * - Tags: getTags, getTagBySlug, createTag, updateTag, deleteTag
 * - Media: getMedia, getMediaById, createMedia, updateMedia, deleteMedia
 * - Pinterest: getBoards, getPins, createPin, etc.
 * - Settings: getSetting, updateSetting
 * 
 * IMPORTANT: When modifying queries, ensure column names match the actual D1 database.
 * Categories use: label (not name), depth (not display_order), is_online (not is_nav)
 * 
 * @see schema.ts for table definitions
 * @see DATABASE_SCHEMA.md for field documentation
 */

import { eq, and, or, like, desc, asc, sql, count, inArray, isNull } from 'drizzle-orm';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { createDb, type DrizzleDb } from './drizzle';
import {
  articles,
  categories,
  authors,
  tags,
  articlesToTags,
  media,
  pinterestBoards,
  pinterestPins,
  pinTemplates,
  siteSettings,
  redirects,
  type Article as DrizzleArticle,
  type Category as DrizzleCategory,
  type Author as DrizzleAuthor,
  type Tag as DrizzleTag,
  type Media as DrizzleMedia,
  type NewArticle,
  type NewCategory,
  type NewAuthor,
  type NewTag,
} from './schema';

// Re-export Env interface for compatibility
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  R2_PUBLIC_URL: string;
  JWT_SECRET: string;
}

// Using Drizzle-inferred types internally
type Article = DrizzleArticle & {
  category?: DrizzleCategory;
  author?: DrizzleAuthor;
  tags?: DrizzleTag[];
};
type Category = DrizzleCategory;
type Author = DrizzleAuthor;
type Tag = DrizzleTag;
type Media = DrizzleMedia;

export interface PaginatedArticles {
  items: Article[];
  total: number;
}

// Helper to safely parse JSON strings
function safeParseJson(value: string | null | undefined): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// ============================================
// ARTICLE OPERATIONS
// ============================================

export async function getArticles(
  db: D1Database,
  options?: {
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
): Promise<PaginatedArticles> {
  const drizzle = createDb(db);

  const conditions: any[] = [];
  
  // Filter soft-deleted
  conditions.push(isNull(articles.deletedAt));

  if (options?.isOnline === true) {
    conditions.push(eq(articles.isOnline, true));
  } else if (options?.isOnline === false) {
    conditions.push(eq(articles.isOnline, false));
  }

  if (options?.type) {
    conditions.push(eq(articles.type, options.type));
  }

  // Handle categoryId or categorySlug
  if (options?.categoryId) {
    conditions.push(eq(articles.categoryId, options.categoryId));
  } else if (options?.categorySlug) {
    const category = await drizzle.select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, options.categorySlug))
      .get();
    if (category) {
      conditions.push(eq(articles.categoryId, category.id));
    }
  }

  // Handle authorId or authorSlug
  if (options?.authorId) {
    conditions.push(eq(articles.authorId, options.authorId));
  } else if (options?.authorSlug) {
    const author = await drizzle.select({ id: authors.id })
      .from(authors)
      .where(eq(authors.slug, options.authorSlug))
      .get();
    if (author) {
      conditions.push(eq(articles.authorId, author.id));
    }
  }

  if (options?.publishedAfter) {
    conditions.push(sql`${articles.publishedAt} > ${options.publishedAfter.toISOString()}`);
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

  // Get items with relations
  const items = await drizzle.query.articles.findMany({
    where: whereClause,
    with: {
      category: true,
      author: true,
      articlesToTags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [desc(articles.publishedAt)],
    limit: options?.limit,
    offset: options?.offset,
  });

  // Get total count
  const [{ count: total }] = await drizzle
    .select({ count: count() })
    .from(articles)
    .where(whereClause);

  // Map items with tags
  const mappedItems = items.map(item => ({
    ...item,
    recipeJson: safeParseJson(item.recipeJson),
    faqsJson: safeParseJson(item.faqsJson),
    tags: item.articlesToTags?.map(at => at.tag).filter(Boolean) || [],
  }));

  // Handle tag filtering (post-query)
  let filteredItems = mappedItems;
  if (options?.tagSlug) {
    filteredItems = mappedItems.filter(item =>
      item.tags?.some(tag => tag?.slug === options.tagSlug)
    );
  }

  return {
    items: filteredItems as Article[],
    total: Number(total),
  };
}

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
    with: {
      category: true,
      author: true,
      articlesToTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!result) return null;

  return {
    ...result,
    recipeJson: safeParseJson(result.recipeJson),
    faqsJson: safeParseJson(result.faqsJson),
    tags: result.articlesToTags?.map(at => at.tag).filter(Boolean) || [],
  } as Article;
}

export async function createArticle(
  db: D1Database,
  article: Partial<NewArticle> & { tags?: string[] }
): Promise<Article | null> {
  const drizzle = createDb(db);

  const { slug, categoryId, authorId, headline, shortDescription, tags: tagSlugs, ...rest } = article;

  if (!slug || !categoryId || !authorId || !headline || !shortDescription) {
    throw new Error('Missing required fields: slug, categoryId, authorId, headline, shortDescription');
  }

  // Insert article
  const [inserted] = await drizzle.insert(articles).values({
    slug,
    type: rest.type || 'article',
    categoryId,
    authorId,
    headline,
    shortDescription,
    subtitle: rest.subtitle,
    excerpt: rest.excerpt,
    introduction: rest.introduction,
    imagesJson: rest.imagesJson,
    contentJson: rest.contentJson,
    recipeJson: rest.recipeJson,
    roundupJson: rest.roundupJson,
    faqsJson: rest.faqsJson,
    isOnline: rest.isOnline ?? false,
    isFavorite: rest.isFavorite ?? false,
    workflowStatus: rest.workflowStatus || 'draft',
    publishedAt: rest.publishedAt || new Date().toISOString(),
  }).returning();

  // Handle tags
  if (tagSlugs && tagSlugs.length > 0 && inserted) {
    const tagRecords = await drizzle
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.slug, tagSlugs));

    if (tagRecords.length > 0) {
      await drizzle.insert(articlesToTags).values(
        tagRecords.map(tag => ({
          articleId: inserted.id,
          tagId: tag.id,
        }))
      );
    }
  }

  return getArticleBySlug(db, slug);
}

export async function updateArticle(
  db: D1Database,
  slug: string,
  article: Partial<NewArticle> & { tags?: string[] }
): Promise<Article | null> {
  const drizzle = createDb(db);

  const existing = await getArticleBySlug(db, slug);
  if (!existing) return null;

  // Build update object with only valid schema fields
  const updateData: Partial<NewArticle> = {};

  if (article.type !== undefined) updateData.type = article.type;
  if (article.categoryId !== undefined) updateData.categoryId = article.categoryId;
  if (article.authorId !== undefined) updateData.authorId = article.authorId;
  if (article.headline !== undefined) updateData.headline = article.headline;
  if (article.subtitle !== undefined) updateData.subtitle = article.subtitle;
  if (article.shortDescription !== undefined) updateData.shortDescription = article.shortDescription;
  if (article.excerpt !== undefined) updateData.excerpt = article.excerpt;
  if (article.introduction !== undefined) updateData.introduction = article.introduction;
  if (article.imagesJson !== undefined) updateData.imagesJson = article.imagesJson;
  if (article.contentJson !== undefined) updateData.contentJson = article.contentJson;
  if (article.recipeJson !== undefined) updateData.recipeJson = article.recipeJson;
  if (article.roundupJson !== undefined) updateData.roundupJson = article.roundupJson;
  if (article.faqsJson !== undefined) updateData.faqsJson = article.faqsJson;
  if (article.seoJson !== undefined) updateData.seoJson = article.seoJson;
  if (article.configJson !== undefined) updateData.configJson = article.configJson;
  if (article.workflowStatus !== undefined) updateData.workflowStatus = article.workflowStatus;
  if (article.isOnline !== undefined) updateData.isOnline = article.isOnline;
  if (article.isFavorite !== undefined) updateData.isFavorite = article.isFavorite;
  if (article.publishedAt !== undefined) updateData.publishedAt = article.publishedAt;

  // Update article
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await drizzle.update(articles)
      .set(updateData)
      .where(eq(articles.slug, slug));
  }

  // Update tags if provided
  if (article.tags !== undefined) {
    await drizzle.delete(articlesToTags)
      .where(eq(articlesToTags.articleId, existing.id));

    if (article.tags.length > 0) {
      const tagRecords = await drizzle
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.slug, article.tags));

      if (tagRecords.length > 0) {
        await drizzle.insert(articlesToTags).values(
          tagRecords.map(tag => ({
            articleId: existing.id,
            tagId: tag.id,
          }))
        );
      }
    }
  }

  return getArticleBySlug(db, slug);
}

export async function deleteArticle(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  // Soft delete
  await drizzle.update(articles)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(articles.slug, slug));
  return true;
}

export async function incrementViewCount(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.slug, slug));
  return true;
}

// ============================================
// CATEGORY OPERATIONS
// Aligned with: schema-drizzle/schema.sql
// ============================================

export async function getCategories(
  db: D1Database,
  options?: { isOnline?: boolean; isFeatured?: boolean; parentId?: number | null }
): Promise<Category[]> {
  const drizzle = createDb(db);

  const conditions: any[] = [isNull(categories.deletedAt)];
  
  if (options?.isOnline !== undefined) {
    conditions.push(eq(categories.isOnline, options.isOnline));
  }
  if (options?.isFeatured !== undefined) {
    conditions.push(eq(categories.isFeatured, options.isFeatured));
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

export async function getCategoryBySlug(db: D1Database, slug: string): Promise<Category | null> {
  const drizzle = createDb(db);
  return await drizzle.query.categories.findFirst({
    where: and(eq(categories.slug, slug), isNull(categories.deletedAt)),
  }) || null;
}

export async function createCategory(
  db: D1Database,
  category: Partial<NewCategory>
): Promise<Category | null> {
  const drizzle = createDb(db);

  if (!category.slug || !category.label) {
    throw new Error('Missing required fields: slug, label');
  }

  const [inserted] = await drizzle.insert(categories).values({
    slug: category.slug,
    label: category.label,
    parentId: category.parentId,
    depth: category.depth ?? 0,
    headline: category.headline,
    collectionTitle: category.collectionTitle,
    shortDescription: category.shortDescription,
    imagesJson: category.imagesJson ?? '{}',
    color: category.color ?? '#ff6600ff',
    iconSvg: category.iconSvg,
    isFeatured: category.isFeatured ?? false,
    seoJson: category.seoJson ?? '{}',
    configJson: category.configJson ?? '{}',
    i18nJson: category.i18nJson ?? '{}',
    sortOrder: category.sortOrder ?? 0,
    isOnline: category.isOnline ?? false,
    cachedPostCount: category.cachedPostCount ?? 0,
  }).returning();

  return inserted || null;
}

export async function updateCategory(
  db: D1Database,
  slug: string,
  category: Partial<NewCategory>
): Promise<Category | null> {
  const drizzle = createDb(db);

  const updateData: Partial<NewCategory> = {};

  // Navigation & Hierarchy
  if (category.label !== undefined) updateData.label = category.label;
  if (category.parentId !== undefined) updateData.parentId = category.parentId;
  if (category.depth !== undefined) updateData.depth = category.depth;
  
  // Display Text
  if (category.headline !== undefined) updateData.headline = category.headline;
  if (category.collectionTitle !== undefined) updateData.collectionTitle = category.collectionTitle;
  if (category.shortDescription !== undefined) updateData.shortDescription = category.shortDescription;
  
  // Visuals
  if (category.imagesJson !== undefined) updateData.imagesJson = category.imagesJson;
  if (category.color !== undefined) updateData.color = category.color;
  if (category.iconSvg !== undefined) updateData.iconSvg = category.iconSvg;
  
  // Logic & JSON Config
  if (category.isFeatured !== undefined) updateData.isFeatured = category.isFeatured;
  if (category.seoJson !== undefined) updateData.seoJson = category.seoJson;
  if (category.configJson !== undefined) updateData.configJson = category.configJson;
  if (category.i18nJson !== undefined) updateData.i18nJson = category.i18nJson;
  
  // System & Metrics
  if (category.sortOrder !== undefined) updateData.sortOrder = category.sortOrder;
  if (category.isOnline !== undefined) updateData.isOnline = category.isOnline;
  if (category.cachedPostCount !== undefined) updateData.cachedPostCount = category.cachedPostCount;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await drizzle.update(categories)
      .set(updateData)
      .where(eq(categories.slug, slug));
  }

  return getCategoryBySlug(db, slug);
}

export async function deleteCategory(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  // Soft delete
  await drizzle.update(categories)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(categories.slug, slug));
  return true;
}

// ============================================
// AUTHOR OPERATIONS
// ============================================

export async function getAuthors(
  db: D1Database,
  options?: { isOnline?: boolean }
): Promise<Author[]> {
  const drizzle = createDb(db);

  const conditions = [isNull(authors.deletedAt)];
  if (options?.isOnline !== undefined) {
    conditions.push(eq(authors.isOnline, options.isOnline));
  }

  return await drizzle
    .select()
    .from(authors)
    .where(and(...conditions))
    .orderBy(asc(authors.sortOrder), asc(authors.name));
}

export async function getAuthorBySlug(db: D1Database, slug: string): Promise<Author | null> {
  const drizzle = createDb(db);
  return await drizzle.query.authors.findFirst({
    where: and(eq(authors.slug, slug), isNull(authors.deletedAt)),
  }) || null;
}

export async function createAuthor(
  db: D1Database,
  author: Partial<NewAuthor>
): Promise<Author | null> {
  const drizzle = createDb(db);

  if (!author.slug || !author.name) {
    throw new Error('Missing required fields: slug, name');
  }

  const [inserted] = await drizzle.insert(authors).values({
    slug: author.slug,
    name: author.name,
    email: author.email,
    jobTitle: author.jobTitle,
    role: author.role || 'writer',
    headline: author.headline,
    shortDescription: author.shortDescription,
    introduction: author.introduction,
    imagesJson: author.imagesJson,
    bioJson: author.bioJson,
    isOnline: author.isOnline ?? true,
    isFeatured: author.isFeatured ?? false,
    sortOrder: author.sortOrder ?? 0,
  }).returning();

  return inserted || null;
}

export async function updateAuthor(
  db: D1Database,
  slug: string,
  author: Partial<NewAuthor>
): Promise<Author | null> {
  const drizzle = createDb(db);

  const updateData: Partial<NewAuthor> = {};

  if (author.name !== undefined) updateData.name = author.name;
  if (author.email !== undefined) updateData.email = author.email;
  if (author.jobTitle !== undefined) updateData.jobTitle = author.jobTitle;
  if (author.role !== undefined) updateData.role = author.role;
  if (author.headline !== undefined) updateData.headline = author.headline;
  if (author.shortDescription !== undefined) updateData.shortDescription = author.shortDescription;
  if (author.introduction !== undefined) updateData.introduction = author.introduction;
  if (author.imagesJson !== undefined) updateData.imagesJson = author.imagesJson;
  if (author.bioJson !== undefined) updateData.bioJson = author.bioJson;
  if (author.isOnline !== undefined) updateData.isOnline = author.isOnline;
  if (author.isFeatured !== undefined) updateData.isFeatured = author.isFeatured;
  if (author.sortOrder !== undefined) updateData.sortOrder = author.sortOrder;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await drizzle.update(authors)
      .set(updateData)
      .where(eq(authors.slug, slug));
  }

  return getAuthorBySlug(db, slug);
}

export async function deleteAuthor(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(authors)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(authors.slug, slug));
  return true;
}

// ============================================
// TAG OPERATIONS
// ============================================

export async function getTags(
  db: D1Database,
  options?: { limit?: number }
): Promise<Tag[]> {
  const drizzle = createDb(db);

  const query = drizzle
    .select()
    .from(tags)
    .where(isNull(tags.deletedAt))
    .orderBy(asc(tags.label));

  if (options?.limit) {
    return await query.limit(options.limit);
  }

  return await query;
}

export async function createTag(db: D1Database, tag: Partial<NewTag>): Promise<Tag | null> {
  const drizzle = createDb(db);

  if (!tag.slug || !tag.label) {
    throw new Error('Missing required fields: slug, label');
  }

  const [inserted] = await drizzle.insert(tags).values({
    slug: tag.slug,
    label: tag.label,
    description: tag.description,
    filterGroupsJson: tag.filterGroupsJson,
    styleJson: tag.styleJson,
  }).returning();

  return inserted || null;
}

export async function updateTag(db: D1Database, slug: string, tag: Partial<NewTag>): Promise<Tag | null> {
  const drizzle = createDb(db);

  const updateData: Partial<NewTag> = {};

  if (tag.label !== undefined) updateData.label = tag.label;
  if (tag.description !== undefined) updateData.description = tag.description;
  if (tag.filterGroupsJson !== undefined) updateData.filterGroupsJson = tag.filterGroupsJson;
  if (tag.styleJson !== undefined) updateData.styleJson = tag.styleJson;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await drizzle.update(tags)
      .set(updateData)
      .where(eq(tags.slug, slug));
  }

  return await drizzle.query.tags.findFirst({
    where: eq(tags.slug, slug),
  }) || null;
}

export async function deleteTag(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(tags)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(tags.slug, slug));
  return true;
}

// ============================================
// MEDIA OPERATIONS
// ============================================

export async function getMedia(
  db: D1Database,
  options?: {
    folder?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<Media[]> {
  const drizzle = createDb(db);

  const conditions = [isNull(media.deletedAt)];

  if (options?.folder) {
    conditions.push(eq(media.folder, options.folder));
  }

  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(media.name, searchPattern),
        like(media.altText, searchPattern)
      )!
    );
  }

  const query = drizzle
    .select()
    .from(media)
    .where(and(...conditions))
    .orderBy(
      options?.order === 'asc' ? asc(media.createdAt) : desc(media.createdAt)
    );

  if (options?.limit) {
    if (options?.offset) {
      return await query.limit(options.limit).offset(options.offset);
    }
    return await query.limit(options.limit);
  }

  return await query;
}

export async function getMediaById(db: D1Database, id: number): Promise<Media | null> {
  const drizzle = createDb(db);
  return await drizzle.query.media.findFirst({
    where: and(eq(media.id, id), isNull(media.deletedAt)),
  }) || null;
}

export async function updateMedia(
  db: D1Database, 
  id: number, 
  data: { name?: string; altText?: string; variantsJson?: string; [key: string]: any }
): Promise<boolean> {
  const drizzle = createDb(db);
  
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.altText !== undefined) updateData.altText = data.altText;
  if (data.caption !== undefined) updateData.caption = data.caption;
  if (data.credit !== undefined) updateData.credit = data.credit;
  if (data.variantsJson !== undefined) updateData.variantsJson = data.variantsJson;
  if (data.folder !== undefined) updateData.folder = data.folder;
  
  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString();
    await drizzle.update(media)
      .set(updateData)
      .where(eq(media.id, id));
  }
  
  return true;
}

export async function deleteMedia(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(media)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(media.id, id));
  return true;
}

// ============================================
// PINTEREST OPERATIONS
// ============================================

export async function getPinterestBoards(db: D1Database): Promise<any[]> {
  const drizzle = createDb(db);
  return await drizzle
    .select()
    .from(pinterestBoards)
    .where(isNull(pinterestBoards.deletedAt))
    .orderBy(asc(pinterestBoards.name));
}

export async function getPinterestPins(
  db: D1Database,
  options?: { boardId?: number; articleId?: number; status?: string; limit?: number }
): Promise<any[]> {
  const drizzle = createDb(db);

  const conditions: any[] = [];

  if (options?.boardId) {
    conditions.push(eq(pinterestPins.boardId, options.boardId));
  }
  if (options?.articleId) {
    conditions.push(eq(pinterestPins.articleId, options.articleId));
  }
  if (options?.status) {
    conditions.push(eq(pinterestPins.status, options.status));
  }

  const query = drizzle
    .select()
    .from(pinterestPins)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pinterestPins.createdAt));

  if (options?.limit) {
    return await query.limit(options.limit);
  }

  return await query;
}

// ============================================
// SITE SETTINGS OPERATIONS
// ============================================

export async function getSetting(db: D1Database, key: string): Promise<any> {
  const drizzle = createDb(db);
  const result = await drizzle.query.siteSettings.findFirst({
    where: eq(siteSettings.key, key),
  });
  return result ? safeParseJson(result.value) : null;
}

export async function setSetting(db: D1Database, key: string, value: any): Promise<void> {
  const drizzle = createDb(db);
  await drizzle.insert(siteSettings)
    .values({
      key,
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: JSON.stringify(value),
        updatedAt: new Date().toISOString(),
      },
    });
}

// ============================================
// REDIRECTS OPERATIONS
// ============================================

export async function getRedirects(db: D1Database): Promise<any[]> {
  const drizzle = createDb(db);
  return await drizzle
    .select()
    .from(redirects)
    .where(eq(redirects.isActive, true));
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(db: D1Database): Promise<{
  articles: number;
  categories: number;
  authors: number;
  tags: number;
  totalViews: number;
}> {
  const drizzle = createDb(db);

  const [articleCount] = await drizzle
    .select({ count: count() })
    .from(articles)
    .where(isNull(articles.deletedAt));

  const [categoryCount] = await drizzle
    .select({ count: count() })
    .from(categories)
    .where(isNull(categories.deletedAt));

  const [authorCount] = await drizzle
    .select({ count: count() })
    .from(authors)
    .where(isNull(authors.deletedAt));

  const [tagCount] = await drizzle
    .select({ count: count() })
    .from(tags)
    .where(isNull(tags.deletedAt));

  const [viewCount] = await drizzle
    .select({ total: sql<number>`COALESCE(SUM(${articles.viewCount}), 0)` })
    .from(articles)
    .where(isNull(articles.deletedAt));

  return {
    articles: Number(articleCount.count),
    categories: Number(categoryCount.count),
    authors: Number(authorCount.count),
    tags: Number(tagCount.count),
    totalViews: Number(viewCount.total),
  };
}

// ============================================
// TAG BY SLUG
// ============================================

export async function getTagBySlug(db: D1Database, slug: string): Promise<Tag | null> {
  const drizzle = createDb(db);
  return await drizzle.query.tags.findFirst({
    where: and(eq(tags.slug, slug), isNull(tags.deletedAt)),
  }) || null;
}

