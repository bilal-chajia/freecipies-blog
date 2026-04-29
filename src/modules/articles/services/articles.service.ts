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
import { equipment as equipmentTable } from '../../equipment/schema/equipment.schema';
import { createDb, getDb, type DrizzleDb } from '../../../shared/database/drizzle';
import { hydrateArticle, hydrateArticles, hydrateTag, safeParseJson, type HydratedTag } from '../../../shared/utils/hydration';
import { resolveVariantUrl } from '../../../shared/types/images';
import { generateJsonLd } from '../utils/jsonld';
import type { HydratedArticle } from '../types/articles.types';
import { extractFAQsFromContentDocument, extractTocFromContentDocument } from '../../content-blocks';

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
    'cachedAuthorJson', 'cachedEquipmentJson', 'cachedRatingJson',
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

/**
 * Create a new article
 */
export async function createArticle(
  db: D1Database | DrizzleDb,
  article: NewArticle
): Promise<Article | null> {
  const drizzle = getDb(db);
  const processed = prepareJsonFields(article as any);

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

  const processed = prepareJsonFields(article as any);
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

  const processedPatch = prepareJsonFields(patch);

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
      role: (article as any).authorRole || null,
    });
  }

  if (article.categoryId) {
    updateData.cachedCategoryJson = JSON.stringify({
      label: article.categoryLabel,
      slug: article.categorySlug,
      color: article.categoryColor,
    });
  }

  // Extract TOC from contentJson
  const toc = extractTocFromContentDocument(article.contentJson, article.headline);
  if (toc.length > 0) {
    updateData.cachedTocJson = JSON.stringify(toc);
  }

  // ── Extract FAQs from content_json faq_section blocks ──
  if (article.contentJson) {
    const faqs = extractFAQsFromContentDocument(article.contentJson);
    (updateData as any).faqsJson = faqs.length > 0
      ? JSON.stringify(faqs)
      : '[]';
  }

  // ── Sync recipe scalar indexes & cached recipe summary ──
  // These populate articles.totalTimeMinutes, articles.difficultyLabel,
  // and articles.cachedRecipeJson for optimized SQL filtering/listing.
  let recipe: any = null;
  let totalTimeMinutes: number | null = null;
  if (article.type === 'recipe' && article.recipeJson) {
    recipe = safeParseJson<any>(article.recipeJson);
    if (recipe) {
      // Derive total time: explicit total, or prep + cook
      totalTimeMinutes = recipe.total
        ?? (((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null);

      // Scalar index columns for SQL WHERE/ORDER BY
      (updateData as any).totalTimeMinutes = totalTimeMinutes;
      (updateData as any).difficultyLabel = recipe.difficulty ?? null;

      // Cached recipe summary for optimized listing API
      (updateData as any).cachedRecipeJson = JSON.stringify({
        isRecipe: true,
        totalTimeMinutes,
        difficulty: recipe.difficulty ?? null,
        servings: recipe.servings ?? null,
        caloriesPerServing: recipe.nutrition?.calories ?? null,
        primaryDietLabels: (recipe.suitableForDiet ?? []).slice(0, 3),
        mainIngredients: (recipe.ingredients ?? [])
          .flatMap((g: any) => g.items ?? [])
          .slice(0, 5)
          .map((i: any) => i.name),
        isQuick: (totalTimeMinutes ?? 999) <= 30,
        isHealthy: (recipe.suitableForDiet?.length ?? 0) > 0,
        isBudget: recipe.estimatedCost === 'Budget',
      });

      // ── Sync cachedEquipmentJson ──
      // Look up equipment names from recipeJson in the equipment table
      // to get rich data (brand, description, image, price, affiliate info)
      const recipeEquipment: any[] = recipe.equipment ?? [];
      if (recipeEquipment.length > 0) {
        const equipNames = recipeEquipment.map((e: any) =>
          (typeof e === 'string' ? e : e.name)?.toLowerCase().trim()
        ).filter(Boolean);

        // Fetch all active equipment in one query
        const allEquip = await drizzle
          .select()
          .from(equipmentTable)
          .where(eq(equipmentTable.isActive, true))
          .all();

        // Match by name (case-insensitive)
        const matched = allEquip.filter((eq: any) =>
          equipNames.includes(eq.name?.toLowerCase().trim())
        );

        // Build CachedEquipmentItem[] with all rich fields
        const cachedEquip = matched.map((eq: any) => {
          // Find the recipe equipment entry to get 'required' flag
          const recipeEntry = recipeEquipment.find((re: any) =>
            (typeof re === 'string' ? re : re.name)?.toLowerCase().trim() === eq.name?.toLowerCase().trim()
          );
          // Parse imageJson to extract image URL
          let imageUrl: string | undefined;
          try {
            const imgData = typeof eq.imageJson === 'string' ? JSON.parse(eq.imageJson) : eq.imageJson;
            imageUrl = resolveVariantUrl(imgData?.variants?.md || imgData?.variants?.sm || null)
              || imgData?.url || undefined;
          } catch { /* ignore */ }

          return {
            id: eq.id,
            name: eq.name,
            slug: eq.slug,
            brand: eq.brand || undefined,
            description: eq.description || undefined,
            category: eq.category || undefined,
            affiliate_url: eq.affiliateUrl || undefined,
            affiliate_provider: eq.affiliateProvider || undefined,
            affiliate_note: eq.affiliateNote || undefined,
            price_display: eq.priceDisplay || undefined,
            image_url: imageUrl,
            required: typeof recipeEntry === 'object' ? (recipeEntry.required !== false) : true,
          };
        });

        (updateData as any).cachedEquipmentJson = JSON.stringify(cachedEquip);
      } else {
        // No equipment in recipe — clear the cache
        (updateData as any).cachedEquipmentJson = '[]';
      }
    }
  }

  // ── Generate cached_card_json for zero-join card rendering ──
  {
    const images = safeParseJson<any>(article.imagesJson) || {};
    const coverVariants = images?.cover?.variants;

    const thumbnail = coverVariants ? {
      alt: images?.cover?.alt || article.headline,
      variants: {
        xs: coverVariants.xs ? { url: resolveVariantUrl(coverVariants.xs), width: coverVariants.xs.width } : undefined,
        sm: coverVariants.sm ? { url: resolveVariantUrl(coverVariants.sm), width: coverVariants.sm.width } : undefined,
        md: coverVariants.md ? { url: resolveVariantUrl(coverVariants.md), width: coverVariants.md.width } : undefined,
        lg: coverVariants.lg ? { url: resolveVariantUrl(coverVariants.lg), width: coverVariants.lg.width } : undefined,
      }
    } : null;

    const card: Record<string, any> = {
      id: article.id,
      type: article.type,
      slug: article.slug,
      headline: article.headline,
      short_description: article.shortDescription,
      thumbnail,
    };

    if (article.type === 'recipe' && recipe) {
      card.total_time = totalTimeMinutes;
      card.difficulty = recipe.difficulty ?? null;
      card.servings = recipe.servings ?? null;
      card.rating = safeParseJson<any>(article.cachedRatingJson) || null;
    } else if (article.type === 'article') {
      card.reading_time = article.readingTimeMinutes || null;
      card.category = safeParseJson<any>(article.cachedCategoryJson)?.label || null;
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
    const resolvedSiteUrl = siteUrl || (article as any).siteUrl || 'https://freecipies.com';
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

  const currentValue = recipe.aggregateRating?.ratingValue || 0;
  const currentCount = recipe.aggregateRating?.ratingCount || 0;

  // 3. Calculate exact average
  const newCount = currentCount + 1;
  const newValue = Number(((currentValue * currentCount + rating) / newCount).toFixed(1));

  const newRating = {
    ratingValue: newValue,
    ratingCount: newCount
  };

  // 4. Update recipeJson
  recipe.aggregateRating = newRating;
  const recipeJson = JSON.stringify(recipe);

  // 5. Update database (and cache)
  await drizzle.update(articles)
    .set({ 
      recipeJson, 
      cachedRatingJson: JSON.stringify(newRating),
      updatedAt: new Date().toISOString() 
    })
    .where(eq(articles.id, articleId));

  return newRating;
}
