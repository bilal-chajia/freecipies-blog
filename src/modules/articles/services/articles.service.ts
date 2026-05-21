/**
 * Articles Module - Database Service
 * ====================================
 * Database operations for articles.
 */

import { eq, and, or, like, desc, asc, isNull, sql, inArray, gte, lte } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { getTableColumns } from 'drizzle-orm';
import { articles, type Article, type NewArticle } from '../schema/articles.schema';
import { articlesToTags } from '../schema/articles-to-tags.schema';
import { categories } from '../../categories/schema/categories.schema';
import { authors } from '../../authors/schema/authors.schema';
import { tags as tagsTable } from '../../tags/schema/tags.schema';
import { equipment as equipmentTable, type Equipment } from '../../equipment/schema/equipment.schema';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';
import { hydrateArticle, hydrateArticles, hydrateTag, safeParseJson, type HydratedTag } from '../../../shared/utils/hydration';
import { generateJsonLd, type ArticleRow } from '../utils/jsonld';
import type { HydratedArticle, ArticleContent, RecipeContent, RoundupContent } from '../types/articles.types';
import { extractTocFromContentDocument } from '../../content-blocks';
import { buildCachedRatingJson, buildCachedRecipeJson, normalizeRecipeJson } from '../utils/article-json-contract';
import {
  buildAuthorCache,
  buildCategoryCache,
  buildTagsCache,
  buildRecipeCache,
  buildCardCache,
} from './cache-builders';

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
  db: D1Database | DrizzleDb,
  articleId: number,
  tagIds: number[]
): Promise<HydratedTag[]> {
  const drizzle = getDb(db);
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
  const hydratedTags = await getTagsForArticleId(drizzle, articleId);
  const cachedTagsJson = JSON.stringify(buildTagsCache(hydratedTags as any));
  await drizzle.update(articles)
    .set({ cachedTagsJson, updatedAt: new Date().toISOString() })
    .where(eq(articles.id, articleId));

  return hydratedTags;
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
  dateFrom?: string;
  dateTo?: string;
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
  db: D1Database | DrizzleDb,
  options?: ArticleQueryOptions
): Promise<PaginatedArticles> {
  const drizzle = getDb(db);

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
    const categorySubquery = drizzle
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, options.categorySlug), isNull(categories.deletedAt)));
    conditions.push(inArray(articles.categoryId, categorySubquery));
  }

  if (options?.authorSlug && !options.authorId) {
    const authorSubquery = drizzle
      .select({ id: authors.id })
      .from(authors)
      .where(and(eq(authors.slug, options.authorSlug), isNull(authors.deletedAt)));
    conditions.push(inArray(articles.authorId, authorSubquery));
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

  // Convert full JS ISO strings to SQLite format: "YYYY-MM-DD HH:MM:SS"
  const formatSqliteDate = (isoString: string) => {
    return isoString.replace('T', ' ').substring(0, 19);
  };

  if (options?.dateFrom) {
    conditions.push(gte(articles.publishedAt, formatSqliteDate(options.dateFrom)));
  }

  if (options?.dateTo) {
    conditions.push(lte(articles.publishedAt, formatSqliteDate(options.dateTo)));
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
    .select(getTableColumns(articles))
    .from(articles)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(options?.limit || 100)
    .offset(options?.offset || 0);

  const [{ count: total }] = await drizzle
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(whereClause);

  return {
    items: hydrateArticles(items).map((item) => {
      if (item.type === 'recipe') {
        return item as RecipeContent;
      }
      if (item.type === 'roundup') {
        return item as RoundupContent;
      }
      return item as ArticleContent;
    }),
    total: Number(total),
  };
}

/**
 * Get a single article by slug
 */
export async function getArticleBySlug(
  db: D1Database | DrizzleDb,
  slug: string,
  type?: 'recipe' | 'article' | 'roundup'
): Promise<HydratedArticle | null> {
  const drizzle = getDb(db);

  const conditions = [eq(articles.slug, slug), isNull(articles.deletedAt)];
  if (type) {
    conditions.push(eq(articles.type, type));
  }

  const result = await drizzle.query.articles.findFirst({
    where: and(...conditions),
  });

  if (!result) return null;

  const hydrated = hydrateArticle(result);
  const articleTags = await getTagsForArticleId(drizzle, result.id);
  const fullArticle = { ...hydrated, tags: articleTags };

  if (fullArticle.type === 'recipe') {
    return fullArticle as RecipeContent;
  }
  if (fullArticle.type === 'roundup') {
    return fullArticle as RoundupContent;
  }
  return fullArticle as ArticleContent;
}

/**
 * Helper to ensure JSON fields are stringified before database operations
 */
function prepareJsonFields(patch: Record<string, any>): Record<string, any> {
  const processed = { ...patch };
  const jsonFields = [
    'imagesJson', 'contentJson', 'recipeJson', 'roundupJson',
    'faqsJson', 'seoJson', 'configJson', 'jsonldJson',
    'cachedTagsJson', 'cachedCategoryJson',
    'cachedAuthorJson', 'cachedRatingJson',
    'cachedTocJson', 'cachedRecipeJson', 'cachedCardJson'
  ];

  for (const field of jsonFields) {
    if (field in processed && processed[field] !== undefined && processed[field] !== null) {
      const value = processed[field];
      if (typeof value === 'object') {
        processed[field] = JSON.stringify(value);
      }
    }
  }
  return processed;
}

type RecipeEquipmentEntry = {
  id?: string;
  equipment_id?: number | null;
  label?: string;
  required?: boolean;
  notes?: string | null;
  source_type?: 'catalog' | 'manual';
  snapshot?: Record<string, unknown> | null;
};

function buildEquipmentSnapshot(row: Equipment): Record<string, unknown> {
  const image = safeParseJson<Record<string, unknown>>(row.imageJson || '{}') || {};
  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    image,
    affiliate_url: row.affiliateUrl ?? null,
    affiliate_provider: row.affiliateProvider ?? null,
    affiliate_note: row.affiliateNote ?? null,
  };
}

async function attachEquipmentSnapshots<T extends Record<string, any>>(
  drizzle: DrizzleDb,
  patch: T
): Promise<T> {
  if (!patch.recipeJson || typeof patch.recipeJson !== 'object') return patch;

  const recipeJson = { ...patch.recipeJson };
  if (!Array.isArray(recipeJson.equipment)) return patch;

  const catalogIds: number[] = Array.from(new Set<number>(
    recipeJson.equipment
      .map((item: RecipeEquipmentEntry) => Number(item?.equipment_id))
      .filter((id: number) => Number.isFinite(id) && id > 0)
  ));

  if (!catalogIds.length) {
    recipeJson.equipment = recipeJson.equipment.map((item: RecipeEquipmentEntry, index: number) => ({
      id: item.id ?? `eq-${index + 1}`,
      equipment_id: null,
      label: item.label ?? '',
      required: item.required !== false,
      notes: item.notes ?? null,
      source_type: 'manual',
      snapshot: null,
    }));
    return { ...patch, recipeJson } as T;
  }

  const rows = await drizzle
    .select()
    .from(equipmentTable)
    .where(and(
      inArray(equipmentTable.id, catalogIds),
      eq(equipmentTable.isActive, true),
      isNull(equipmentTable.deletedAt)
    ));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = catalogIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`Inactive or missing equipment_id: ${missing.join(', ')}`);
  }

  recipeJson.equipment = recipeJson.equipment.map((item: RecipeEquipmentEntry, index: number) => {
    const equipmentId = Number(item?.equipment_id);
    if (!Number.isFinite(equipmentId) || equipmentId <= 0) {
      return {
        id: item.id ?? `eq-${index + 1}`,
        equipment_id: null,
        label: item.label ?? '',
        required: item.required !== false,
        notes: item.notes ?? null,
        source_type: 'manual',
        snapshot: null,
      };
    }

    const row = byId.get(equipmentId);
    if (!row) {
      throw new Error(`Inactive or missing equipment_id: ${equipmentId}`);
    }

    return {
      id: item.id ?? `eq-${index + 1}`,
      equipment_id: equipmentId,
      label: item.label || row.name,
      required: item.required !== false,
      notes: item.notes ?? null,
      source_type: 'catalog',
      snapshot: buildEquipmentSnapshot(row),
    };
  });

  return { ...patch, recipeJson } as T;
}

/**
 * Create a new article
 */
export async function createArticle(
  db: D1Database | DrizzleDb,
  article: NewArticle
): Promise<Article | null> {
  const drizzle = getDb(db);
  const withEquipmentSnapshots = await attachEquipmentSnapshots(drizzle, article);
  const processed = prepareJsonFields(withEquipmentSnapshots) as NewArticle;

  const [inserted] = await drizzle.insert(articles).values(processed).returning();
  return inserted || null;
}

/**
 * Update an article
 */
export async function updateArticle(
  db: D1Database | DrizzleDb,
  slug: string,
  article: Partial<NewArticle>
): Promise<boolean> {
  const drizzle = getDb(db);

  const withEquipmentSnapshots = await attachEquipmentSnapshots(drizzle, article);
  const processed = prepareJsonFields(withEquipmentSnapshots) as Partial<NewArticle>;
  const updateData = {
    ...processed,
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
export async function deleteArticle(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.update(articles)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(articles.slug, slug));
  return true;
}

/**
 * Increment view count
 */
export async function incrementViewCount(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
  const drizzle = getDb(db);
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
  db: D1Database | DrizzleDb,
  id: number
): Promise<HydratedArticle | null> {
  const drizzle = getDb(db);

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
  db: D1Database | DrizzleDb,
  id: number,
  patch: Partial<NewArticle>
): Promise<boolean> {
  const drizzle = getDb(db);

  const withEquipmentSnapshots = await attachEquipmentSnapshots(drizzle, patch);
  const processedPatch = prepareJsonFields(withEquipmentSnapshots);

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
export async function deleteArticleById(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);

  const result = await drizzle.update(articles)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .returning({ id: articles.id });

  return result.length > 0;
}

/**
 * Toggle online status by ID
 */
export async function toggleOnlineById(db: D1Database | DrizzleDb, id: number): Promise<{ isOnline: boolean } | null> {
  const drizzle = getDb(db);

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
export async function toggleFavoriteById(db: D1Database | DrizzleDb, id: number): Promise<{ isFavorite: boolean } | null> {
  const drizzle = getDb(db);

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
 * Populates optimized fields like cachedAuthorJson, cachedCategoryJson, and cachedTocJson
 */
export async function syncCachedFields(
  db: D1Database | DrizzleDb,
  id: number,
  siteUrl?: string
): Promise<boolean> {
  const drizzle = getDb(db);

  const article = await drizzle
    .select({
      ...getTableColumns(articles),
      authorName: authors.name,
      authorSlug: authors.slug,
      authorAvatar: authors.imagesJson,
      authorRole: authors.jobTitle,
      authorBio: authors.shortDescription,
      authorBioJson: authors.bioJson,
      authorDeletedAt: authors.deletedAt,
      categoryIdValue: categories.id,
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

  // 1. Build Domain Payloads (Pass objects in direct, avoid redundant JSON parsing!)
  const cachedAuthor = buildAuthorCache({
    authorId: article.authorId,
    authorName: article.authorName,
    authorSlug: article.authorSlug,
    authorAvatar: article.authorAvatar,
    authorRole: article.authorRole,
    authorBio: article.authorBio,
    authorBioJson: article.authorBioJson,
  });
  if (cachedAuthor) {
    updateData.cachedAuthorJson = JSON.stringify(cachedAuthor);
  }

  const cachedCategory = buildCategoryCache({
    categoryId: article.categoryId,
    categoryIdValue: article.categoryIdValue,
    categoryLabel: article.categoryLabel,
    categorySlug: article.categorySlug,
    categoryColor: article.categoryColor,
  });
  if (cachedCategory) {
    updateData.cachedCategoryJson = JSON.stringify(cachedCategory);
  }

  const hydratedTags = await getTagsForArticleId(drizzle, id);
  const cachedTags = buildTagsCache(hydratedTags as any);
  updateData.cachedTagsJson = JSON.stringify(cachedTags);

  // Extract TOC from contentJson
  const toc = extractTocFromContentDocument(article.contentJson, article.headline, article.roundupJson);
  updateData.cachedTocJson = JSON.stringify(toc);

  // Sync cached recipe summary
  let recipeRaw: any = null;
  let totalTimeMinutes: number | null = null;
  let cachedRecipe: any = null;
  let cachedRating: any = null;

  const recipeCacheRes = buildRecipeCache(article.type, article.recipeJson);
  if (recipeCacheRes) {
    updateData.recipeJson = recipeCacheRes.recipeJson;
    updateData.cachedRecipeJson = JSON.stringify(recipeCacheRes.cachedRecipeJson);
    updateData.cachedRatingJson = JSON.stringify(recipeCacheRes.cachedRatingJson);
    totalTimeMinutes = recipeCacheRes.totalTimeMinutes;
    recipeRaw = recipeCacheRes.recipeRaw;

    cachedRecipe = recipeCacheRes.cachedRecipeJson;
    cachedRating = recipeCacheRes.cachedRatingJson;
  }

  // 2. Generate cached_card_json using pre-computed objects
  const card = buildCardCache(
    {
      id: article.id,
      type: article.type,
      slug: article.slug,
      headline: article.headline,
      shortDescription: article.shortDescription,
      imagesJson: article.imagesJson,
      readingTimeMinutes: article.readingTimeMinutes,
      roundupJson: article.roundupJson,
    },
    {
      author: cachedAuthor,
      category: cachedCategory,
      tags: cachedTags,
      recipe: cachedRecipe,
      rating: cachedRating,
      totalTimeMinutes,
      recipeRaw,
    }
  );
  updateData.cachedCardJson = JSON.stringify(card);

  // 3. Generate JSON-LD schemas for SEO
  const resolvedSiteUrl = siteUrl || 'https://saas-blog.com';
  const schemas = generateJsonLd(article as ArticleRow, resolvedSiteUrl);
  updateData.jsonldJson = JSON.stringify(schemas);

  // 4. Update the database
  await drizzle.update(articles)
    .set(updateData)
    .where(eq(articles.id, id));

  return true;
}

/**
 * Get popular articles by view count (and recent fallback)
 */
export async function getPopularArticles(
  db: D1Database | DrizzleDb,
  limit: number = 10
) {
  const drizzle = getDb(db);

  const result = await drizzle
    .select({
      id: articles.id,
      slug: articles.slug,
      label: articles.headline,
      type: articles.type,
      imagesJson: articles.imagesJson,
      viewCount: articles.viewCount,
      categoryLabel: categories.label,
      categorySlug: categories.slug
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .where(eq(articles.isOnline, true))
    .orderBy(desc(articles.viewCount), desc(articles.createdAt))
    .limit(limit);

  return result;
}

/**
 * Add a vote to a recipe (Express Method: updates JSON directly)
 */
export async function addRecipeVote(
  db: D1Database | DrizzleDb,
  articleId: number,
  rating: number
): Promise<{ ratingValue: number; ratingCount: number } | null> {
  const drizzle = getDb(db);

  // 1. Get current article
  const article = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, articleId), isNull(articles.deletedAt)),
    columns: { recipeJson: true, cachedRatingJson: true }
  });

  if (!article) return null;

  // 2. Parse current rating
  const recipe = safeParseJson<any>(article.recipeJson);
  if (!recipe) return null;

  const normalizedRecipe = normalizeRecipeJson(recipe);
  const currentValue = normalizedRecipe.aggregate_rating?.rating_value || 0;
  const currentCount = normalizedRecipe.aggregate_rating?.rating_count || 0;

  // 3. Calculate exact average
  const newCount = currentCount + 1;
  const newValue = Number(((currentValue * currentCount + rating) / newCount).toFixed(1));

  const newRating = {
    rating_value: newValue,
    rating_count: newCount
  };

  // 4. Update recipeJson
  normalizedRecipe.aggregate_rating = newRating;
  const recipeJson = JSON.stringify(normalizedRecipe);

  // 5. Update database (and cache)
  await drizzle.update(articles)
    .set({ 
      recipeJson, 
      cachedRatingJson: JSON.stringify(newRating),
      cachedRecipeJson: JSON.stringify(buildCachedRecipeJson(normalizedRecipe, 'recipe')),
      updatedAt: new Date().toISOString() 
    })
    .where(eq(articles.id, articleId));

  return { ratingValue: newValue, ratingCount: newCount };
}
