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
import { resyncPresentationFeatured } from '../../categories/snapshot/featured-article';
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

async function getTagsForArticleId(drizzle: any, article_id: number): Promise<HydratedTag[]> {
  const rows = await drizzle
    .select({ ...getTableColumns(tagsTable) })
    .from(articlesToTags)
    .innerJoin(tagsTable, eq(articlesToTags.tag_id, tagsTable.id))
    .where(and(eq(articlesToTags.article_id, article_id), isNull(tagsTable.deleted_at)))
    .orderBy(asc(tagsTable.label));

  return rows.map(hydrateTag);
}

export async function setArticleTagsById(
  db: D1Database | DrizzleDb,
  article_id: number,
  tagIds: number[]
): Promise<HydratedTag[]> {
  const drizzle = getDb(db);
  const uniqueTagIds = Array.from(new Set(tagIds.filter((id) => Number.isFinite(id) && id > 0)));

  // Resolve to existing (non-deleted) tags only (prevents FK failures + keeps cache clean)
  const resolvedTags = uniqueTagIds.length
    ? await drizzle
      .select({ id: tagsTable.id, label: tagsTable.label })
      .from(tagsTable)
      .where(and(inArray(tagsTable.id, uniqueTagIds), isNull(tagsTable.deleted_at)))
    : [];

  // Replace join rows
  await drizzle.delete(articlesToTags).where(eq(articlesToTags.article_id, article_id));
  if (resolvedTags.length) {
    await drizzle.insert(articlesToTags).values(
      resolvedTags.map((tag) => ({ article_id: article_id, tag_id: tag.id }))
    );
  }

  // Update zero-join cache (used by search indexing + UI)
  const hydratedTags = await getTagsForArticleId(drizzle, article_id);
  const cached_tags_json = JSON.stringify(buildTagsCache(hydratedTags as any));
  await drizzle.update(articles)
    .set({ cached_tags_json, updated_at: new Date().toISOString() })
    .where(eq(articles.id, article_id));

  return hydratedTags;
}

export interface ArticleQueryOptions {
  category_id?: number;
  author_id?: number;
  categorySlug?: string;
  authorSlug?: string;
  tagSlug?: string;
  limit?: number;
  offset?: number;
  type?: 'recipe' | 'article' | 'roundup';
  dateFrom?: string;
  dateTo?: string;
  publishedAfter?: Date;
  workflow_status?: string;
  search?: string;
  sortBy?: 'published_at' | 'title' | 'view_count';
  sort_order?: 'asc' | 'desc';
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
  conditions.push(isNull(articles.deleted_at));

  if (options?.workflow_status) {
    if (options.workflow_status !== 'all') {
      conditions.push(eq(articles.workflow_status, options.workflow_status));
    }
  }

  if (options?.type) {
    conditions.push(eq(articles.type, options.type));
  }

  if (options?.category_id) {
    conditions.push(eq(articles.category_id, options.category_id));
  }

  if (options?.author_id) {
    conditions.push(eq(articles.author_id, options.author_id));
  }

  // Support filtering by slug relations if IDs not provided
  if (options?.categorySlug && !options.category_id) {
    const categorySubquery = drizzle
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, options.categorySlug), isNull(categories.deleted_at)));
    conditions.push(inArray(articles.category_id, categorySubquery));
  }

  if (options?.authorSlug && !options.author_id) {
    const authorSubquery = drizzle
      .select({ id: authors.id })
      .from(authors)
      .where(and(eq(authors.slug, options.authorSlug), isNull(authors.deleted_at)));
    conditions.push(inArray(articles.author_id, authorSubquery));
  }

  if (options?.tagSlug) {
    conditions.push(sql`exists(
      select 1
      from ${articlesToTags}
      inner join ${tagsTable} on ${tagsTable.id} = ${articlesToTags.tag_id}
      where ${articlesToTags.article_id} = ${articles.id}
        and ${tagsTable.slug} = ${options.tagSlug}
        and ${tagsTable.deleted_at} is null
    )`);
  }

  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(articles.headline, searchPattern),
        like(articles.short_description, searchPattern)
      )
    );
  }

  // Convert full JS ISO strings to SQLite format: "YYYY-MM-DD HH:MM:SS"
  const formatSqliteDate = (isoString: string) => {
    return isoString.replace('T', ' ').substring(0, 19);
  };

  if (options?.dateFrom) {
    conditions.push(gte(articles.published_at, formatSqliteDate(options.dateFrom)));
  }

  if (options?.dateTo) {
    conditions.push(lte(articles.published_at, formatSqliteDate(options.dateTo)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Dynamic sorting based on options
  const sortColumn = options?.sortBy === 'title'
    ? articles.headline
    : options?.sortBy === 'view_count'
      ? articles.view_count
      : articles.published_at;
  const orderByClause = options?.sort_order === 'asc'
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

  const conditions = [eq(articles.slug, slug), isNull(articles.deleted_at)];
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
    'images_json', 'content_json', 'recipe_json', 'roundup_json',
    'faqs_json', 'seo_json', 'config_json', 'jsonld_json',
    'cached_tags_json', 'cached_category_json',
    'cached_author_json', 'cached_rating_json',
    'cached_toc_json', 'cached_recipe_json', 'cached_card_json'
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
  const image = safeParseJson<Record<string, unknown>>(row.image_json || '{}') || {};
  return {
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    image,
    affiliate_url: row.affiliate_url ?? null,
    affiliate_provider: row.affiliate_provider ?? null,
    affiliate_note: row.affiliate_note ?? null,
  };
}

async function attachEquipmentSnapshots<T extends Record<string, any>>(
  drizzle: DrizzleDb,
  patch: T
): Promise<T> {
  if (!patch.recipe_json || typeof patch.recipe_json !== 'object') return patch;

  const recipe_json = { ...patch.recipe_json };
  if (!Array.isArray(recipe_json.equipment)) return patch;

  const catalogIds: number[] = Array.from(new Set<number>(
    recipe_json.equipment
      .map((item: RecipeEquipmentEntry) => Number(item?.equipment_id))
      .filter((id: number) => Number.isFinite(id) && id > 0)
  ));

  if (!catalogIds.length) {
    recipe_json.equipment = recipe_json.equipment.map((item: RecipeEquipmentEntry, index: number) => ({
      id: item.id ?? `eq-${index + 1}`,
      equipment_id: null,
      label: item.label ?? '',
      required: item.required !== false,
      notes: item.notes ?? null,
      source_type: 'manual',
      snapshot: null,
    }));
    return { ...patch, recipe_json } as T;
  }

  const rows = await drizzle
    .select()
    .from(equipmentTable)
    .where(and(
      inArray(equipmentTable.id, catalogIds),
      eq(equipmentTable.is_active, true),
      isNull(equipmentTable.deleted_at)
    ));

  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = catalogIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`Inactive or missing equipment_id: ${missing.join(', ')}`);
  }

  recipe_json.equipment = recipe_json.equipment.map((item: RecipeEquipmentEntry, index: number) => {
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

  return { ...patch, recipe_json } as T;
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
    updated_at: new Date().toISOString(),
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
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(articles.slug, slug));
  return true;
}

/**
 * Increment view count
 */
export async function incrementViewCount(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.update(articles)
    .set({ view_count: sql`${articles.view_count} + 1` })
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
      authorImagesJson: authors.images_json,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.category_id, categories.id))
    .leftJoin(authors, eq(articles.author_id, authors.id))
    .where(and(eq(articles.id, id), isNull(articles.deleted_at)))
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
    updated_at: new Date().toISOString(),
  };

  const result = await drizzle.update(articles)
    .set(updateData)
    .where(and(eq(articles.id, id), isNull(articles.deleted_at)))
    .returning({ id: articles.id });

  return result.length > 0;
}

/**
 * Soft delete an article by ID
 */
export async function deleteArticleById(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);

  const result = await drizzle.update(articles)
    .set({ deleted_at: new Date().toISOString() })
    .where(and(eq(articles.id, id), isNull(articles.deleted_at)))
    .returning({ id: articles.id });

  return result.length > 0;
}

/**
 * Set workflow status by ID
 */
export async function setWorkflowStatusById(
  db: D1Database | DrizzleDb,
  id: number,
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived'
): Promise<{ workflow_status: string } | null> {
  const drizzle = getDb(db);

  const current = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deleted_at)),
    columns: { id: true }
  });

  if (!current) return null;

  const updateFields: any = {
    workflow_status: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'published') {
    updateFields.published_at = new Date().toISOString();
  }

  await drizzle.update(articles)
    .set(updateFields)
    .where(eq(articles.id, id));

  return { workflow_status: status };
}

/**
 * Toggle favorite status by ID
 */
export async function toggleFavoriteById(db: D1Database | DrizzleDb, id: number): Promise<{ is_favorite: boolean } | null> {
  const drizzle = getDb(db);

  const current = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, id), isNull(articles.deleted_at)),
    columns: { is_favorite: true }
  });

  if (!current) return null;

  const newValue = !current.is_favorite;

  await drizzle.update(articles)
    .set({ is_favorite: newValue, updated_at: new Date().toISOString() })
    .where(eq(articles.id, id));

  return { is_favorite: newValue };
}

/**
 * Synchronize cached JSON fields for an article
 * Populates optimized fields like cached_author_json, cached_category_json, and cached_toc_json
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
      authorAvatar: authors.images_json,
      authorRole: authors.job_title,
      authorBio: authors.short_description,
      authorBioJson: authors.bio_json,
      authorDeletedAt: authors.deleted_at,
      category_id_value: categories.id,
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
    })
    .from(articles)
    .leftJoin(authors, eq(articles.author_id, authors.id))
    .leftJoin(categories, eq(articles.category_id, categories.id))
    .where(eq(articles.id, id))
    .get();

  if (!article) return false;

  const updateData: Partial<Article> = {};

  // 1. Build Domain Payloads (Pass objects in direct, avoid redundant JSON parsing!)
  const cachedAuthor = buildAuthorCache({
    author_id: article.author_id,
    authorName: article.authorName,
    authorSlug: article.authorSlug,
    authorAvatar: article.authorAvatar,
    authorRole: article.authorRole,
    authorBio: article.authorBio,
    authorBioJson: article.authorBioJson,
  });
  if (cachedAuthor) {
    updateData.cached_author_json = JSON.stringify(cachedAuthor);
  }

  const cachedCategory = buildCategoryCache({
    category_id: article.category_id,
    category_id_value: article.category_id_value,
    categoryLabel: article.categoryLabel,
    categorySlug: article.categorySlug,
    categoryColor: article.categoryColor,
  });
  if (cachedCategory) {
    updateData.cached_category_json = JSON.stringify(cachedCategory);
  }

  const hydratedTags = await getTagsForArticleId(drizzle, id);
  const cachedTags = buildTagsCache(hydratedTags as any);
  updateData.cached_tags_json = JSON.stringify(cachedTags);

  // Extract TOC from content_json
  const toc = extractTocFromContentDocument(article.content_json, article.headline, article.roundup_json);
  updateData.cached_toc_json = JSON.stringify(toc);

  // Sync cached recipe summary
  let recipeRaw: any = null;
  let totalTimeMinutes: number | null = null;
  let cachedRecipe: any = null;
  let cachedRating: any = null;

  const recipeCacheRes = buildRecipeCache(article.type, article.recipe_json);
  if (recipeCacheRes) {
    updateData.recipe_json = recipeCacheRes.recipe_json;
    updateData.cached_recipe_json = JSON.stringify(recipeCacheRes.cached_recipe_json);
    updateData.cached_rating_json = JSON.stringify(recipeCacheRes.cached_rating_json);
    totalTimeMinutes = recipeCacheRes.totalTimeMinutes;
    recipeRaw = recipeCacheRes.recipeRaw;

    cachedRecipe = recipeCacheRes.cached_recipe_json;
    cachedRating = recipeCacheRes.cached_rating_json;
  }

  // 2. Generate cached_card_json using pre-computed objects
  const card = buildCardCache(
    {
      id: article.id,
      type: article.type,
      slug: article.slug,
      headline: article.headline,
      short_description: article.short_description,
      images_json: article.images_json,
      reading_time_minutes: article.reading_time_minutes,
      roundup_json: article.roundup_json,
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
  updateData.cached_card_json = JSON.stringify(card);

  // 3. Generate JSON-LD schemas for SEO
  const resolvedSiteUrl = siteUrl || 'https://saas-blog.com';
  const schemas = generateJsonLd(article as ArticleRow, resolvedSiteUrl);
  updateData.jsonld_json = JSON.stringify(schemas);

  // 4. Update the database
  await drizzle.update(articles)
    .set(updateData)
    .where(eq(articles.id, id));

  // 5. Resync category featured-article snapshots pointing at this article
  // (presentation_json snapshot pattern: source of truth = the article).
  const isLive = article.workflow_status === 'published' && !article.deleted_at;
  const candidates = await drizzle
    .select({ id: categories.id, presentation_json: categories.presentation_json })
    .from(categories)
    .where(like(categories.presentation_json, '%"featured_article"%'));

  for (const candidate of candidates) {
    const updated = resyncPresentationFeatured(candidate.presentation_json, id, isLive && card ? card : null);
    if (updated !== null) {
      await drizzle.update(categories)
        .set({ presentation_json: updated, updated_at: new Date().toISOString() })
        .where(eq(categories.id, candidate.id));
    }
  }

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
      images_json: articles.images_json,
      view_count: articles.view_count,
      categoryLabel: categories.label,
      categorySlug: categories.slug
    })
    .from(articles)
    .leftJoin(categories, eq(articles.category_id, categories.id))
    .where(and(eq(articles.workflow_status, 'published'), isNull(articles.deleted_at)))
    .orderBy(desc(articles.view_count), desc(articles.created_at))
    .limit(limit);

  return result;
}

/**
 * Add a vote to a recipe (Express Method: updates JSON directly)
 */
export async function addRecipeVote(
  db: D1Database | DrizzleDb,
  article_id: number,
  rating: number
): Promise<{ ratingValue: number; ratingCount: number } | null> {
  const drizzle = getDb(db);

  // 1. Get current article
  const article = await drizzle.query.articles.findFirst({
    where: and(eq(articles.id, article_id), isNull(articles.deleted_at)),
    columns: { recipe_json: true, cached_rating_json: true }
  });

  if (!article) return null;

  // 2. Parse current rating
  const recipe = safeParseJson<any>(article.recipe_json);
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

  // 4. Update recipe_json
  normalizedRecipe.aggregate_rating = newRating;
  const recipe_json = JSON.stringify(normalizedRecipe);

  // 5. Update database (and cache)
  await drizzle.update(articles)
    .set({
      recipe_json,
      cached_rating_json: JSON.stringify(newRating),
      cached_recipe_json: JSON.stringify(buildCachedRecipeJson(normalizedRecipe, 'recipe')),
      updated_at: new Date().toISOString()
    })
    .where(eq(articles.id, article_id));

  return { ratingValue: newValue, ratingCount: newCount };
}
