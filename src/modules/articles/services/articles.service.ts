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
import { generateJsonLd } from '../utils/jsonld';
import type { HydratedArticle } from '../types/articles.types';
import { extractTocFromContentDocument } from '../../content-blocks';
import { buildCachedRatingJson, buildCachedRecipeJson, normalizeRecipeJson } from '../utils/article-json-contract';

async function getTagsForArticleId(drizzle: any, articleId: number): Promise<HydratedTag[]> {
  const rows = await drizzle
    .select({ ...getTableColumns(tagsTable) })
    .from(articlesToTags)
    .innerJoin(tagsTable, eq(articlesToTags.tagId, tagsTable.id))
    .where(and(eq(articlesToTags.articleId, articleId), isNull(tagsTable.deletedAt)))
    .orderBy(asc(tagsTable.label));

  return rows.map(hydrateTag);
}

function buildCachedTagSnapshots(tags: HydratedTag[]) {
  return tags.map((tag: any) => ({
    id: tag.id,
    label: tag.label,
    slug: tag.slug,
    color: tag.color ?? null,
  }));
}

function normalizeCardVariant(variant: any) {
  if (!variant || typeof variant !== 'object' || !variant.r2_key) return undefined;
  return {
    r2_key: variant.r2_key,
    width: Number(variant.width) || 0,
    height: Number(variant.height) || 0,
    ...(Number.isFinite(Number(variant.size_bytes)) ? { size_bytes: Number(variant.size_bytes) } : {}),
  };
}

function buildCardImage(imagesJson: unknown, fallbackAlt: string) {
  const images = safeParseJson<any>(imagesJson as any) || {};
  const slot = images.thumbnail || images.hero;
  if (!slot?.variants) return null;
  const xs = normalizeCardVariant(slot.variants.xs);
  const sm = normalizeCardVariant(slot.variants.sm);
  if (!xs || !sm) return null;
  return {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    alt: slot.alt || fallbackAlt,
    placeholder: slot.placeholder || '',
    variants: { xs, sm },
  };
}

function buildAuthorSocialLinks(bioJson: unknown) {
  const bio = safeParseJson<any>(bioJson as any) || {};
  const socials = Array.isArray(bio.socials) ? bio.socials : [];
  return socials
    .filter((item: any) => item && typeof item === 'object' && item.network && item.url)
    .map((item: any) => ({
      network: item.network,
      url: item.url,
      ...(item.label ? { label: item.label } : {}),
    }));
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
  const cachedTagsJson = JSON.stringify(buildCachedTagSnapshots(hydratedTags));
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

  const itemsQuery = drizzle
    .select(getTableColumns(articles))
    .from(articles);

  // Link for filtering if slugs provided
  if (options?.categorySlug && !options.categoryId) {
    (itemsQuery as any).leftJoin(categories, eq(articles.categoryId, categories.id));
  }
  if (options?.authorSlug && !options.authorId) {
    (itemsQuery as any).leftJoin(authors, eq(articles.authorId, authors.id));
  }

  const items = await itemsQuery
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(options?.limit || 100)
    .offset(options?.offset || 0);

  const countQuery = drizzle
    .select({ count: sql<number>`count(*)` })
    .from(articles);

  if (options?.categorySlug && !options.categoryId) {
    (countQuery as any).leftJoin(categories, eq(articles.categoryId, categories.id));
  }
  if (options?.authorSlug && !options.authorId) {
    (countQuery as any).leftJoin(authors, eq(articles.authorId, authors.id));
  }

  const [{ count: total }] = await countQuery.where(whereClause);

  return {
    items: hydrateArticles(items as any[]),
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
  const articleTags = await getTagsForArticleId(drizzle, (result as any).id);
  return { ...hydrated, tags: articleTags } as any;
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

async function attachEquipmentSnapshots(
  drizzle: DrizzleDb,
  patch: Record<string, any>
): Promise<Record<string, any>> {
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
    return { ...patch, recipeJson };
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

  return { ...patch, recipeJson };
}

/**
 * Create a new article
 */
export async function createArticle(
  db: D1Database | DrizzleDb,
  article: NewArticle
): Promise<Article | null> {
  const drizzle = getDb(db);
  const withEquipmentSnapshots = await attachEquipmentSnapshots(drizzle, article as any);
  const processed = prepareJsonFields(withEquipmentSnapshots);

  const [inserted] = await drizzle.insert(articles).values(processed as any).returning();
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

  const withEquipmentSnapshots = await attachEquipmentSnapshots(drizzle, article as any);
  const processed = prepareJsonFields(withEquipmentSnapshots);
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

  if (article.authorId) {
    const authorImages = safeParseJson<any>((article as any).authorAvatar) || {};
    updateData.cachedAuthorJson = JSON.stringify({
      id: article.authorId,
      name: article.authorName,
      slug: article.authorSlug,
      job_title: (article as any).authorRole || null,
      bio: (article as any).authorBio || null,
      avatar: authorImages.avatar || null,
      social_links: buildAuthorSocialLinks((article as any).authorBioJson),
    });
  }

  if (article.categoryId) {
    updateData.cachedCategoryJson = JSON.stringify({
      id: (article as any).categoryIdValue ?? article.categoryId,
      label: article.categoryLabel,
      slug: article.categorySlug,
      color: article.categoryColor,
    });
  }

  updateData.cachedTagsJson = JSON.stringify(buildCachedTagSnapshots(await getTagsForArticleId(drizzle, id)));

  // Extract TOC from contentJson
  const toc = extractTocFromContentDocument(article.contentJson, article.headline, article.roundupJson);
  updateData.cachedTocJson = JSON.stringify(toc);

  // ── Sync cached recipe summary ──
  // Recipe-specific list/card metadata stays in cachedRecipeJson, not
  // top-level articles columns.
  let recipe: any = null;
  let totalTimeMinutes: number | null = null;
  if (article.type === 'recipe' && article.recipeJson) {
    recipe = normalizeRecipeJson(safeParseJson<any>(article.recipeJson));
    if (recipe) {
      // Derive total time: explicit total, or prep + cook
      totalTimeMinutes = recipe.total
        ?? (((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null);

      // Cached recipe summary for optimized listing API
      (updateData as any).recipeJson = JSON.stringify(recipe);
      (updateData as any).cachedRecipeJson = JSON.stringify(buildCachedRecipeJson(recipe, article.type));
      (updateData as any).cachedRatingJson = JSON.stringify(buildCachedRatingJson(recipe));

    }
  }

  // ── Generate cached_card_json for zero-join card rendering ──
  {
    const cachedCategory = safeParseJson<any>((updateData.cachedCategoryJson ?? article.cachedCategoryJson) as any) || {};
    const cachedAuthor = safeParseJson<any>((updateData.cachedAuthorJson ?? article.cachedAuthorJson) as any) || {};
    const cachedTags = safeParseJson<any[]>((updateData.cachedTagsJson ?? article.cachedTagsJson) as any) || [];
    const cachedRecipe = safeParseJson<any>(((updateData as any).cachedRecipeJson ?? article.cachedRecipeJson) as any) || {};
    const cachedRating = safeParseJson<any>(((updateData as any).cachedRatingJson ?? article.cachedRatingJson) as any) || {};

    const card: Record<string, any> = {
      id: article.id,
      type: article.type,
      slug: article.slug,
      headline: article.headline,
      short_description: article.shortDescription,
      image: buildCardImage(article.imagesJson, article.headline),
      category: Object.keys(cachedCategory).length ? cachedCategory : null,
      author: Object.keys(cachedAuthor).length ? {
        id: cachedAuthor.id,
        slug: cachedAuthor.slug,
        name: cachedAuthor.name,
        job_title: cachedAuthor.job_title ?? null,
        avatar: cachedAuthor.avatar ?? null,
      } : null,
      tags: cachedTags,
    };

    if (article.type === 'recipe' && recipe) {
      card.recipe = {
        total_time_minutes: cachedRecipe.total_time_minutes ?? totalTimeMinutes,
        difficulty: cachedRecipe.difficulty ?? recipe.difficulty ?? null,
        calories_per_serving: cachedRecipe.calories_per_serving ?? null,
        badges: cachedRecipe.badges ?? {},
      };
      card.rating = Object.keys(cachedRating).length ? cachedRating : null;
    } else if (article.type === 'article') {
      card.reading_time = article.readingTimeMinutes || null;
    } else if (article.type === 'roundup') {
      const roundupData = safeParseJson<any>(article.roundupJson);
      card.item_count = roundupData?.items?.length ?? 0;
    }

    (updateData as any).cachedCardJson = JSON.stringify(card);
  }

  // ── Generate JSON-LD schemas for SEO ──
  // Stores all Schema.org structured data at save time.
  // Frontend reads jsonldJson directly via SEO.astro — no per-page reconstruction.
  {
    const resolvedSiteUrl = siteUrl || (article as any).siteUrl || 'https://saas-blog.com';
    const schemas = generateJsonLd(article as any, resolvedSiteUrl);
    (updateData as any).jsonldJson = JSON.stringify(schemas);
  }

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
