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
import { createDb } from '../../../shared/database/drizzle';
import { hydrateArticle, hydrateArticles, hydrateTag, safeParseJson, type HydratedTag } from '../../../shared/utils/hydration';
import type { HydratedArticle } from '../types/articles.types';

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
  db: D1Database,
  article: NewArticle
): Promise<Article | null> {
  const drizzle = createDb(db);
  const processed = prepareJsonFields(article as any);

  const [inserted] = await drizzle.insert(articles).values(processed as any).returning();
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
 * Strip inline markdown formatting from text → plain text for TOC display.
 * Handles: **bold**, *italic*, [links](url), `code`, ***bolditalic***
 */
function stripInlineMarkdown(text: string): string {
  return text
    // Links [label](url) → label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Bold + italic ***text*** → text
    .replace(/\*{3}(.+?)\*{3}/g, '$1')
    // Bold **text** → text
    .replace(/\*{2}(.+?)\*{2}/g, '$1')
    // Italic *text* → text
    .replace(/\*(.+?)\*/g, '$1')
    // Inline code `text` → text
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/**
 * Generate a slug ID from text (must match ContentRenderer heading ID logic).
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

/**
 * Extract Table of Contents from contentJson.
 * - Strips markdown from heading text for clean display
 * - Includes recipe_card / main_recipe blocks as "Recipe" entry
 * - Includes faq_section blocks as "FAQ" entry
 */
function extractTocFromContent(contentJson: string | null, headline?: string): { id: string; text: string; level: number }[] {
  if (!contentJson) return [];

  try {
    const blocks = JSON.parse(contentJson);
    if (!Array.isArray(blocks)) return [];

    const toc: { id: string; text: string; level: number }[] = [];

    for (const block of blocks) {
      // ── Heading blocks (h2, h3, h4) ─────────────────────
      if (block.type === 'heading' && block.text) {
        const level = block.level || 2;
        if (level > 4) continue;

        const rawText = String(block.text || '').trim();
        if (!rawText) continue;

        const text = stripInlineMarkdown(rawText);
        // ID uses the raw (pre-stripped) text to match ContentRenderer
        const id = slugify(rawText);

        toc.push({ id, text, level });
      }

      // ── Recipe block → "Recipe" TOC entry ───────────────
      if (block.type === 'recipe_card' || block.type === 'main_recipe') {
        toc.push({ id: 'recipe-card', text: headline || 'Recipe', level: 2 });
      }

      // ── FAQ block → "FAQ" TOC entry ─────────────────────
      if (block.type === 'faq_section') {
        toc.push({ id: 'faq-section', text: 'Frequently Asked Questions', level: 2 });
      }
    }

    return toc;
  } catch {
    return [];
  }
}

/**
 * Synchronize cached JSON fields for an article
 * Populates optimized fields like cachedAuthorJson, cachedCategoryJson, and cachedTocJson
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

  // Extract TOC from contentJson
  const toc = extractTocFromContent(article.contentJson, article.headline);
  if (toc.length > 0) {
    updateData.cachedTocJson = JSON.stringify(toc);
  }

  // ── Sync recipe scalar indexes & cached recipe summary ──
  // These populate articles.totalTimeMinutes, articles.difficultyLabel,
  // and articles.cachedRecipeJson for optimized SQL filtering/listing.
  if (article.type === 'recipe' && article.recipeJson) {
    const recipe = safeParseJson<any>(article.recipeJson);
    if (recipe) {
      // Derive total time: explicit total, or prep + cook
      const totalTimeMinutes = recipe.total
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
            imageUrl = imgData?.variants?.md?.url || imgData?.variants?.sm?.url || imgData?.url || undefined;
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

  await drizzle.update(articles)
    .set(updateData)
    .where(eq(articles.id, id));

  return true;
}

/**
 * Get popular articles by view count (and recent fallback)
 */
export async function getPopularArticles(
  db: D1Database,
  limit: number = 10
) {
  const drizzle = createDb(db);
  
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
