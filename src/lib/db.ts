/**
 * Drizzle-based database operations
 * Drop-in replacement for db.ts using Drizzle ORM
 */

import { eq, and, or, like, desc, asc, sql, count, inArray } from 'drizzle-orm';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { createDb, type DrizzleDb } from './drizzle';
import {
  articles,
  categories,
  authors,
  tags,
  articleTags,
  media,
  pinterestBoards,
  pinterestPins,
  pinTemplates,
  siteSettings,
  redirects,
  type Article,
  type Category,
  type Author,
  type Tag,
  type Media,
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

export interface PaginatedArticles {
  items: ArticleWithRelations[];
  total: number;
}

// Extended Article type with computed relations
export interface ArticleWithRelations extends Article {
  category?: Category;
  author?: Author;
  tags?: Tag[];
}

// ============================================
// ARTICLE OPERATIONS
// ============================================

export async function getArticles(
  db: D1Database,
  options?: {
    categorySlug?: string;
    authorSlug?: string;
    tagSlug?: string;
    limit?: number;
    offset?: number;
    type?: 'recipe' | 'article';
    publishedAfter?: Date;
    isOnline?: boolean;
    search?: string;
  }
): Promise<PaginatedArticles> {
  const drizzle = createDb(db);

  // Build where conditions
  const conditions: any[] = [];

  if (options?.isOnline === true) {
    conditions.push(eq(articles.isOnline, true));
  } else if (options?.isOnline === false) {
    conditions.push(eq(articles.isOnline, false));
  }

  if (options?.type) {
    conditions.push(eq(articles.type, options.type));
  }

  if (options?.categorySlug) {
    conditions.push(eq(articles.categorySlug, options.categorySlug));
  }

  if (options?.authorSlug) {
    conditions.push(eq(articles.authorSlug, options.authorSlug));
  }

  if (options?.publishedAfter) {
    conditions.push(sql`${articles.publishedAt} > ${options.publishedAfter.toISOString()}`);
  }

  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(articles.label, searchPattern),
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
      articleTags: {
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

  // Transform items to include tags array
  const transformedItems = items.map(item => ({
    ...item,
    tags: item.articleTags?.map(at => at.tag) || [],
  }));

  // Handle tag filtering (post-query for now)
  let filteredItems = transformedItems;
  if (options?.tagSlug) {
    filteredItems = transformedItems.filter(item =>
      item.tags?.some(tag => tag?.slug === options.tagSlug)
    );
  }

  return {
    items: filteredItems as ArticleWithRelations[],
    total: Number(total),
  };
}

export async function getArticleBySlug(
  db: D1Database,
  slug: string,
  type?: 'recipe' | 'article'
): Promise<ArticleWithRelations | null> {
  const drizzle = createDb(db);

  const conditions = [eq(articles.slug, slug)];
  if (type) {
    conditions.push(eq(articles.type, type));
  }

  const result = await drizzle.query.articles.findFirst({
    where: and(...conditions),
    with: {
      category: true,
      author: true,
      articleTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!result) return null;

  return {
    ...result,
    tags: result.articleTags?.map(at => at.tag) || [],
  } as ArticleWithRelations;
}

export async function createArticle(
  db: D1Database,
  article: Partial<ArticleWithRelations> & {
    tags?: string[];
    image?: { url?: string; alt?: string; width?: number; height?: number };
    cover?: { url?: string; alt?: string; width?: number; height?: number };
  }
): Promise<ArticleWithRelations | null> {
  const drizzle = createDb(db);

  const {
    slug, type, categorySlug, authorSlug, label, headline,
    metaTitle, metaDescription, canonicalUrl,
    shortDescription, tldr, introduction, summary,
    image, cover,
    contentJson, recipeJson, faqsJson, keywordsJson, referencesJson, mediaJson,
    isOnline, isFavorite, publishedAt, tags: tagSlugs
  } = article;

  if (!slug || !categorySlug || !authorSlug || !label || !headline) {
    throw new Error('Missing required fields');
  }

  // Insert article
  const [inserted] = await drizzle.insert(articles).values({
    slug,
    type: type || 'article',
    categorySlug,
    authorSlug,
    label,
    headline,
    metaTitle: metaTitle || headline,
    metaDescription: metaDescription || shortDescription || '',
    canonicalUrl,
    shortDescription: shortDescription || '',
    tldr: tldr || '',
    introduction,
    summary,
    imageUrl: image?.url,
    imageAlt: image?.alt,
    imageWidth: image?.width,
    imageHeight: image?.height,
    coverUrl: cover?.url,
    coverAlt: cover?.alt,
    coverWidth: cover?.width,
    coverHeight: cover?.height,
    contentJson: contentJson ? JSON.stringify(contentJson) : null,
    recipeJson: recipeJson ? JSON.stringify(recipeJson) : null,
    faqsJson: faqsJson ? JSON.stringify(faqsJson) : null,
    keywordsJson: keywordsJson ? JSON.stringify(keywordsJson) : null,
    referencesJson: referencesJson ? JSON.stringify(referencesJson) : null,
    mediaJson: mediaJson ? JSON.stringify(mediaJson) : null,
    isOnline: isOnline || false,
    isFavorite: isFavorite || false,
    publishedAt: publishedAt || new Date().toISOString(),
  }).returning();

  // Handle tags
  if (tagSlugs && tagSlugs.length > 0 && inserted) {
    const tagRecords = await drizzle
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.slug, tagSlugs));

    if (tagRecords.length > 0) {
      await drizzle.insert(articleTags).values(
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
  article: Partial<ArticleWithRelations> & {
    tags?: string[];
    image?: { url?: string; alt?: string; width?: number; height?: number } | null;
    cover?: { url?: string; alt?: string; width?: number; height?: number } | null;
  }
): Promise<ArticleWithRelations | null> {
  const drizzle = createDb(db);

  const existing = await getArticleBySlug(db, slug);
  if (!existing) return null;

  // Build update object
  const updateData: Partial<NewArticle> = {};

  if (article.type !== undefined) updateData.type = article.type;
  if (article.categorySlug !== undefined) updateData.categorySlug = article.categorySlug;
  if (article.authorSlug !== undefined) updateData.authorSlug = article.authorSlug;
  if (article.label !== undefined) updateData.label = article.label;
  if (article.headline !== undefined) updateData.headline = article.headline;
  if (article.metaTitle !== undefined) updateData.metaTitle = article.metaTitle;
  if (article.metaDescription !== undefined) updateData.metaDescription = article.metaDescription;
  if (article.canonicalUrl !== undefined) updateData.canonicalUrl = article.canonicalUrl;
  if (article.shortDescription !== undefined) updateData.shortDescription = article.shortDescription;
  if (article.tldr !== undefined) updateData.tldr = article.tldr;
  if (article.introduction !== undefined) updateData.introduction = article.introduction;
  if (article.summary !== undefined) updateData.summary = article.summary;

  // Handle image
  if (article.image !== undefined) {
    updateData.imageUrl = article.image?.url ?? null;
    updateData.imageAlt = article.image?.alt ?? null;
    updateData.imageWidth = article.image?.width ?? null;
    updateData.imageHeight = article.image?.height ?? null;
  }

  // Handle cover
  if (article.cover !== undefined) {
    updateData.coverUrl = article.cover?.url ?? null;
    updateData.coverAlt = article.cover?.alt ?? null;
    updateData.coverWidth = article.cover?.width ?? null;
    updateData.coverHeight = article.cover?.height ?? null;
  }

  // Handle JSON fields
  if (article.contentJson !== undefined) {
    updateData.contentJson = article.contentJson ? JSON.stringify(article.contentJson) : null;
  }
  if (article.recipeJson !== undefined) {
    updateData.recipeJson = article.recipeJson ? JSON.stringify(article.recipeJson) : null;
  }
  if (article.faqsJson !== undefined) {
    updateData.faqsJson = article.faqsJson ? JSON.stringify(article.faqsJson) : null;
  }
  if (article.keywordsJson !== undefined) {
    updateData.keywordsJson = article.keywordsJson ? JSON.stringify(article.keywordsJson) : null;
  }
  if (article.referencesJson !== undefined) {
    updateData.referencesJson = article.referencesJson ? JSON.stringify(article.referencesJson) : null;
  }
  if (article.mediaJson !== undefined) {
    updateData.mediaJson = article.mediaJson ? JSON.stringify(article.mediaJson) : null;
  }

  if (article.isOnline !== undefined) updateData.isOnline = article.isOnline;
  if (article.isFavorite !== undefined) updateData.isFavorite = article.isFavorite;
  if (article.publishedAt !== undefined) updateData.publishedAt = article.publishedAt;

  // Update article
  if (Object.keys(updateData).length > 0) {
    await drizzle.update(articles)
      .set(updateData)
      .where(eq(articles.slug, slug));
  }

  // Update tags if provided
  if (article.tags !== undefined) {
    // Delete existing tags
    await drizzle.delete(articleTags)
      .where(eq(articleTags.articleId, existing.id));

    if (article.tags.length > 0) {
      const tagRecords = await drizzle
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(tags.slug, article.tags));

      if (tagRecords.length > 0) {
        await drizzle.insert(articleTags).values(
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
  const result = await drizzle.delete(articles).where(eq(articles.slug, slug));
  return true;
}

export async function incrementViewCount(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(articles)
    .set({ viewCount: sql`COALESCE(${articles.viewCount}, 0) + 1` })
    .where(eq(articles.slug, slug));
  return true;
}

// ============================================
// CATEGORY OPERATIONS
// ============================================

export async function getCategories(
  db: D1Database,
  options?: { isOnline?: boolean }
): Promise<Category[]> {
  const drizzle = createDb(db);

  const conditions = options?.isOnline !== undefined
    ? eq(categories.isOnline, options.isOnline)
    : undefined;

  return drizzle.query.categories.findMany({
    where: conditions,
    orderBy: [asc(categories.sortOrder), asc(categories.label)],
  });
}

export async function getCategoryBySlug(db: D1Database, slug: string): Promise<Category | null> {
  const drizzle = createDb(db);
  const result = await drizzle.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  return result ?? null;
}

export async function createCategory(
  db: D1Database,
  category: Partial<Category> & {
    image?: { url?: string; alt?: string; width?: number; height?: number };
  }
): Promise<Category | null> {
  const drizzle = createDb(db);

  const { slug, label, headline, metaTitle, metaDescription, shortDescription, tldr,
    image, collectionTitle, numEntriesPerPage, isOnline, isFavorite, sortOrder, color } = category;

  if (!slug || !label) throw new Error('Missing required fields');

  await drizzle.insert(categories).values({
    slug,
    label,
    headline: headline || label,
    metaTitle: metaTitle || label,
    metaDescription: metaDescription || '',
    shortDescription: shortDescription || '',
    tldr: tldr || '',
    imageUrl: image?.url,
    imageAlt: image?.alt,
    imageWidth: image?.width,
    imageHeight: image?.height,
    collectionTitle: collectionTitle || label,
    numEntriesPerPage: numEntriesPerPage || 12,
    isOnline: isOnline || false,
    isFavorite: isFavorite || false,
    sortOrder: sortOrder || 0,
    color: color || '#ff6600',
  });

  return getCategoryBySlug(db, slug);
}

export async function updateCategory(
  db: D1Database,
  slug: string,
  category: Partial<Category> & {
    image?: { url?: string; alt?: string; width?: number; height?: number } | null;
  }
): Promise<Category | null> {
  const drizzle = createDb(db);

  const updateData: Partial<NewCategory> = {};

  if (category.label !== undefined) updateData.label = category.label;
  if (category.headline !== undefined) updateData.headline = category.headline;
  if (category.metaTitle !== undefined) updateData.metaTitle = category.metaTitle;
  if (category.metaDescription !== undefined) updateData.metaDescription = category.metaDescription;
  if (category.shortDescription !== undefined) updateData.shortDescription = category.shortDescription;
  if (category.tldr !== undefined) updateData.tldr = category.tldr;
  if (category.collectionTitle !== undefined) updateData.collectionTitle = category.collectionTitle;
  if (category.numEntriesPerPage !== undefined) updateData.numEntriesPerPage = category.numEntriesPerPage;
  if (category.isOnline !== undefined) updateData.isOnline = category.isOnline;
  if (category.isFavorite !== undefined) updateData.isFavorite = category.isFavorite;
  if (category.sortOrder !== undefined) updateData.sortOrder = category.sortOrder;
  if (category.color !== undefined) updateData.color = category.color;

  // Handle image
  if (category.image !== undefined) {
    updateData.imageUrl = category.image?.url ?? null;
    updateData.imageAlt = category.image?.alt ?? null;
    updateData.imageWidth = category.image?.width ?? null;
    updateData.imageHeight = category.image?.height ?? null;
  }

  if (Object.keys(updateData).length > 0) {
    await drizzle.update(categories).set(updateData).where(eq(categories.slug, slug));
  }

  return getCategoryBySlug(db, slug);
}

export async function deleteCategory(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(categories).where(eq(categories.slug, slug));
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

  const conditions = options?.isOnline !== undefined
    ? eq(authors.isOnline, options.isOnline)
    : undefined;

  return drizzle.query.authors.findMany({
    where: conditions,
    orderBy: [asc(authors.name)],
  });
}

export async function getAuthorBySlug(db: D1Database, slug: string): Promise<Author | null> {
  const drizzle = createDb(db);
  const result = await drizzle.query.authors.findFirst({
    where: eq(authors.slug, slug),
  });
  return result ?? null;
}

export async function createAuthor(
  db: D1Database,
  author: Partial<Author> & {
    image?: { url?: string; alt?: string; width?: number; height?: number };
    bio?: any;
  }
): Promise<Author | null> {
  const drizzle = createDb(db);

  const { slug, name, email, job, metaTitle, metaDescription, shortDescription, tldr,
    image, bio, isOnline, isFavorite } = author;

  if (!slug || !name || !email) throw new Error('Missing required fields');

  await drizzle.insert(authors).values({
    slug,
    name,
    email,
    job,
    metaTitle: metaTitle || name,
    metaDescription: metaDescription || '',
    shortDescription: shortDescription || '',
    tldr: tldr || '',
    imageUrl: image?.url,
    imageAlt: image?.alt,
    imageWidth: image?.width,
    imageHeight: image?.height,
    bioJson: bio ? JSON.stringify(bio) : null,
    isOnline: isOnline || false,
    isFavorite: isFavorite || false,
  });

  return getAuthorBySlug(db, slug);
}

export async function updateAuthor(
  db: D1Database,
  slug: string,
  author: Partial<Author> & {
    image?: { url?: string; alt?: string; width?: number; height?: number } | null;
    bio?: any;
  }
): Promise<Author | null> {
  const drizzle = createDb(db);

  const updateData: Partial<NewAuthor> = {};

  if (author.name !== undefined) updateData.name = author.name;
  if (author.email !== undefined) updateData.email = author.email;
  if (author.job !== undefined) updateData.job = author.job;
  if (author.metaTitle !== undefined) updateData.metaTitle = author.metaTitle;
  if (author.metaDescription !== undefined) updateData.metaDescription = author.metaDescription;
  if (author.shortDescription !== undefined) updateData.shortDescription = author.shortDescription;
  if (author.tldr !== undefined) updateData.tldr = author.tldr;
  if (author.isOnline !== undefined) updateData.isOnline = author.isOnline;
  if (author.isFavorite !== undefined) updateData.isFavorite = author.isFavorite;

  // Handle image
  if (author.image !== undefined) {
    updateData.imageUrl = author.image?.url ?? null;
    updateData.imageAlt = author.image?.alt ?? null;
    updateData.imageWidth = author.image?.width ?? null;
    updateData.imageHeight = author.image?.height ?? null;
  }

  // Handle bio
  if (author.bio !== undefined) {
    updateData.bioJson = author.bio ? JSON.stringify(author.bio) : null;
  }

  if (Object.keys(updateData).length > 0) {
    await drizzle.update(authors).set(updateData).where(eq(authors.slug, slug));
  }

  return getAuthorBySlug(db, slug);
}

export async function deleteAuthor(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(authors).where(eq(authors.slug, slug));
  return true;
}

// ============================================
// TAG OPERATIONS
// ============================================

export async function getTags(
  db: D1Database,
  options?: { isOnline?: boolean }
): Promise<Tag[]> {
  const drizzle = createDb(db);

  const conditions = options?.isOnline !== undefined
    ? eq(tags.isOnline, options.isOnline)
    : undefined;

  return drizzle.query.tags.findMany({
    where: conditions,
    orderBy: [asc(tags.label)],
  });
}

export async function createTag(db: D1Database, tag: Partial<Tag>): Promise<Tag | null> {
  const drizzle = createDb(db);

  const { slug, label, color, isOnline } = tag;
  if (!slug || !label) throw new Error('Missing required fields');

  await drizzle.insert(tags).values({
    slug,
    label,
    color: color || '#ff6600',
    isOnline: isOnline ?? true,
  });

  const result = await drizzle.query.tags.findFirst({
    where: eq(tags.slug, slug),
  });
  return result ?? null;
}

export async function updateTag(db: D1Database, slug: string, tag: Partial<Tag>): Promise<Tag | null> {
  const drizzle = createDb(db);

  const updateData: Partial<NewTag> = {};
  if (tag.label !== undefined) updateData.label = tag.label;
  if (tag.color !== undefined) updateData.color = tag.color;
  if (tag.isOnline !== undefined) updateData.isOnline = tag.isOnline;

  if (Object.keys(updateData).length > 0) {
    await drizzle.update(tags).set(updateData).where(eq(tags.slug, slug));
  }

  const result = await drizzle.query.tags.findFirst({
    where: eq(tags.slug, slug),
  });
  return result ?? null;
}

export async function deleteTag(db: D1Database, slug: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(tags).where(eq(tags.slug, slug));
  return true;
}

// ============================================
// MEDIA OPERATIONS
// ============================================

export async function getMedia(
  db: D1Database,
  options?: {
    type?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<Media[]> {
  const drizzle = createDb(db);

  const conditions: any[] = [];

  if (options?.type && options.type !== 'all') {
    if (options.type === 'image') {
      conditions.push(like(media.mimeType, 'image/%'));
    } else if (options.type === 'video') {
      conditions.push(like(media.mimeType, 'video/%'));
    } else {
      conditions.push(eq(media.mimeType, options.type));
    }
  }

  if (options?.search) {
    const pattern = `%${options.search}%`;
    conditions.push(or(like(media.filename, pattern), like(media.altText, pattern)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderDir = options?.order === 'asc' ? asc : desc;

  return drizzle.query.media.findMany({
    where: whereClause,
    orderBy: [orderDir(media.uploadedAt)],
    limit: options?.limit,
    offset: options?.offset,
  });
}

export async function getMediaById(db: D1Database, id: number): Promise<Media | null> {
  const drizzle = createDb(db);
  const result = await drizzle.query.media.findFirst({
    where: eq(media.id, id),
  });
  return result ?? null;
}

export async function deleteMedia(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(media).where(eq(media.id, id));
  return true;
}

export async function updateMedia(
  db: D1Database,
  id: number,
  updates: { r2Key?: string; url?: string; filename?: string; mimeType?: string; sizeBytes?: number }
): Promise<boolean> {
  const drizzle = createDb(db);

  const updateData: any = {};
  if (updates.r2Key !== undefined) updateData.r2Key = updates.r2Key;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.filename !== undefined) updateData.filename = updates.filename;
  if (updates.mimeType !== undefined) updateData.mimeType = updates.mimeType;
  if (updates.sizeBytes !== undefined) updateData.sizeBytes = updates.sizeBytes;

  if (Object.keys(updateData).length > 0) {
    await drizzle.update(media).set(updateData).where(eq(media.id, id));
  }

  return true;
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(db: D1Database) {
  const drizzle = createDb(db);

  const [articleCount] = await drizzle.select({ count: count() }).from(articles);
  const [categoryCount] = await drizzle.select({ count: count() }).from(categories);
  const [authorCount] = await drizzle.select({ count: count() }).from(authors);
  const [tagCount] = await drizzle.select({ count: count() }).from(tags);

  return {
    articles: Number(articleCount.count),
    categories: Number(categoryCount.count),
    authors: Number(authorCount.count),
    tags: Number(tagCount.count),
  };
}
