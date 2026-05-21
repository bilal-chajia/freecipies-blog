/**
 * Data Hydration Utilities
 * =========================
 * Functions to extract computed fields from JSON columns in database records.
 * These transform raw Drizzle types into enriched types with convenience fields.
 */

import type {
  ImageVariant,
  ImageVariants,
  ImageSlot,
  ImagesJson,
} from '@shared/types/images';
import { resolveVariantUrl, getSrcSet, pickVariantByWidth } from '@shared/types/images';

// Re-export for backwards compatibility
export type { ImageVariant, ImageVariants, ImageSlot };

// ============================================================================
// JSON Parsing Helpers
// ============================================================================

/**
 * Safely parse a JSON string, returning null on failure
 */
export function safeParseJson<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return null;
  }
}

// ============================================================================
// Image Extraction
// ============================================================================

// ImagesJson imported from @shared/types/images
// (union of ArticleImagesJson | AuthorImagesJson | CategoryImagesJson)

export interface ExtractedImage {
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAspectRatio?: string;
  imageObjectPosition?: string;
  imageStyle?: string;
}

type HydratableImageSlot = 'hero' | 'thumbnail' | 'avatar';

function resolveImageSlot(images: ImagesJson, slot: HydratableImageSlot): ImageSlot | null {
  return (images as Partial<Record<HydratableImageSlot, ImageSlot>>)[slot] ?? null;
}

export function getImageSlot(
  imagesJson: string | null | undefined,
  slot: HydratableImageSlot = 'thumbnail'
): ImageSlot | null {
  const images = safeParseJson<ImagesJson>(imagesJson);
  if (!images) return null;
  return resolveImageSlot(images, slot);
}



// buildSrcSet removed — use getSrcSet(slot) from @shared/types/images (C1)

const toCssAspectRatio = (value?: string): string | undefined => {
  if (!value) return undefined;
  if (value.includes('/')) return value;
  if (value.includes(':')) return value.replace(':', ' / ');
  return value;
};

const buildImageStyle = (imageSlot?: ImageSlot): string | undefined => {
  if (!imageSlot) return undefined;
  const styles: string[] = [];

  if (imageSlot.focal_point) {
    styles.push(`object-position: ${imageSlot.focal_point.x}% ${imageSlot.focal_point.y}%`);
  }

  const aspectRatio = toCssAspectRatio(imageSlot.aspect_ratio);
  if (aspectRatio) {
    styles.push(`aspect-ratio: ${aspectRatio}`);
  }

  return styles.length ? styles.join('; ') : undefined;
};

export function getImageSrcSet(
  imagesJson: string | null | undefined,
  slot: HydratableImageSlot = 'thumbnail'
): string {
  const imageSlot = getImageSlot(imagesJson, slot);
  if (!imageSlot) return '';
  return getSrcSet(imageSlot);
}

// pickVariantByWidth removed — use pickVariantByWidth(variants, targetWidth, 1) from @shared/types/images (C2)
// retinaMultiplier=1 preserves the previous hydration behavior (no 2× retina scaling)

/**
 * Extract image URL and metadata from imagesJson field
 * Uses the smallest variant that satisfies targetWidth (when provided),
 * otherwise prefers lg > md > sm > original > xs
 */
export function extractImage(
  imagesJson: string | null | undefined,
  slot: HydratableImageSlot = 'thumbnail',
  targetWidth?: number
): ExtractedImage {
  const images = safeParseJson<ImagesJson>(imagesJson);
  if (!images) return {};

  const imageSlot = resolveImageSlot(images, slot);
  if (!imageSlot) return {};

  const variant = pickVariantByWidth(imageSlot.variants, targetWidth, 1);
  const imageStyle = buildImageStyle(imageSlot);
  const imageAspectRatio = toCssAspectRatio(imageSlot.aspect_ratio);
  const imageObjectPosition = imageSlot.focal_point
    ? `${imageSlot.focal_point.x}% ${imageSlot.focal_point.y}%`
    : undefined;
  const resolvedUrl = resolveVariantUrl(variant);
  if (resolvedUrl && variant) {
    return {
      imageUrl: resolvedUrl,
      imageAlt: imageSlot.alt,
      imageWidth: variant.width,
      imageHeight: variant.height,
      imageAspectRatio,
      imageObjectPosition,
      imageStyle,
    };
  }

  return {};
}

// ============================================================================
// SEO Extraction
// ============================================================================

interface SeoJson {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
  noIndex?: boolean;
  twitterCard?: string;
  robots?: string;
}

export interface ExtractedSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonical?: string;
}

/**
 * Extract SEO metadata from seoJson field
 */
export function extractSeo(seoJson: string | null | undefined): ExtractedSeo {
  const seo = safeParseJson<SeoJson>(seoJson);
  if (!seo) return {};

  return {
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    ogImage: seo.ogImage,
    canonical: seo.canonical ?? undefined,
  };
}

// ============================================================================
// Recipe Extraction
// ============================================================================

// Import comprehensive RecipeJson from articles module
import type { RecipeJson } from '../../modules/articles/types/recipes.types';
export type { RecipeJson };

/**
 * Parse recipe JSON for display
 */
export function extractRecipe(recipeJson: string | null | undefined): RecipeJson | null {
  return safeParseJson<RecipeJson>(recipeJson);
}

// ============================================================================
// Tag Style Extraction
// ============================================================================

interface TagStyleJson {
  color?: string;
  variant?: string;
}

export interface ExtractedTagStyle {
  color?: string;
  variant?: string;
}

/**
 * Extract tag styling from styleJson field
 */
export function extractTagStyle(styleJson: string | null | undefined): ExtractedTagStyle {
  const style = safeParseJson<TagStyleJson>(styleJson);
  if (!style) return {};

  return {
    color: style.color,
    variant: style.variant,
  };
}

// ============================================================================
// Entity Hydration Functions
// ============================================================================

/**
 * Hydrate an article with computed fields and parsed JSON structures
 */
export function hydrateArticle<T extends {
  imagesJson?: string | null;
  contentJson?: string | null;
  recipeJson?: string | null;
  roundupJson?: string | null;
  faqsJson?: string | null;
  seoJson?: string | null;
  authorImagesJson?: string | null;
  cachedAuthorJson?: string | null;
  cachedCategoryJson?: string | null;
  cachedTagsJson?: string | null;
  headline?: string;
  slug: string;
  type?: string;
}>(article: T) {
  const image = extractImage(article.imagesJson);

  const cachedAuthor = article.cachedAuthorJson
    ? safeParseJson<any>(article.cachedAuthorJson)
    : null;

  const cachedCategory = article.cachedCategoryJson
    ? safeParseJson<any>(article.cachedCategoryJson)
    : null;

  // Support multiple author source formats
  let authorAvatar = extractImage(article.authorImagesJson, 'avatar').imageUrl;

  if (!authorAvatar && cachedAuthor) {
    authorAvatar = cachedAuthor?.avatar;
  }

  if (!authorAvatar && (article as any).author?.imagesJson) {
    authorAvatar = extractImage((article as any).author.imagesJson, 'avatar').imageUrl;
  }

  const authorName = (article as any).authorName
    ?? cachedAuthor?.name
    ?? (article as any).author?.name;
  const authorSlug = (article as any).authorSlug
    ?? cachedAuthor?.slug
    ?? (article as any).author?.slug;
  const authorRole = (article as any).authorJob
    ?? cachedAuthor?.job_title
    ?? cachedAuthor?.role
    ?? (article as any).author?.jobTitle;

  const categoryLabel = (article as any).categoryLabel
    ?? cachedCategory?.label
    ?? (article as any).category?.label;
  const categoryColor = (article as any).categoryColor
    ?? cachedCategory?.color
    ?? (article as any).category?.color;
  const categorySlug = (article as any).categorySlug
    ?? cachedCategory?.slug
    ?? (article as any).category?.slug;

  const tags = article.cachedTagsJson
    ? safeParseJson<any[]>(article.cachedTagsJson) || []
    : [];

  const seo = extractSeo(article.seoJson);
  // Generate correct route based on article type
  const route = article.type === 'recipe'
    ? `/recipes/${article.slug}`
    : article.type === 'roundup'
      ? `/roundups/${article.slug}`
      : `/articles/${article.slug}`;

  return {
    ...article,
    ...image,
    ...seo,
    contentJson: safeParseJson(article.contentJson),
    recipeJson: safeParseJson(article.recipeJson),
    recipe: safeParseJson(article.recipeJson), // Alias for RecipeContent.recipe
    roundupJson: safeParseJson(article.roundupJson),
    faqsJson: safeParseJson(article.faqsJson),
    label: article.headline, // Alias for UI consistency
    route,
    authorAvatar,
    author: cachedAuthor ? { ...cachedAuthor, role: authorRole, avatar: cachedAuthor.avatar } : null,
    category: cachedCategory ? { ...cachedCategory, label: categoryLabel, color: categoryColor, slug: categorySlug } : null,
    tags,
    ...(typeof authorName === 'string' ? { authorName } : {}),
    ...(typeof authorSlug === 'string' ? { authorSlug } : {}),
    ...(typeof authorRole === 'string' ? { authorRole } : {}),
    ...(typeof categoryLabel === 'string' ? { categoryLabel } : {}),
    ...(typeof categoryColor === 'string' ? { categoryColor } : {}),
    ...(typeof categorySlug === 'string' ? { categorySlug } : {}),
  };
}

/**
 * Hydrate a category with computed fields
 */
export function hydrateCategory<T extends {
  imagesJson?: string | null;
  seoJson?: string | null;
  configJson?: string | null;
  isFeatured?: boolean | null;
  slug: string;
}>(category: T) {
  const image = extractImage(category.imagesJson);
  const seo = extractSeo(category.seoJson);
  const config = safeParseJson<Record<string, any>>(category.configJson);
  const numEntriesPerPage = config?.postsPerPage;
  const tldr = config?.tldr;
  const layoutMode = config?.layout;
  const cardStyle = config?.cardStyle;
  const showInNav = config?.showInNav;
  const showInFooter = config?.showInFooter;
  const showSidebar = config?.showSidebar;
  const showFilters = config?.showFilters;
  const showBreadcrumb = config?.showBreadcrumb;
  const showPagination = config?.showPagination;
  const sortBy = config?.sortBy;
  const articleSortOrder = config?.sortOrder;
  const headerStyle = config?.headerStyle;
  const featuredArticleIdRaw = config?.featuredArticleId ?? config?.featured_article_id;
  const featuredArticleId = typeof featuredArticleIdRaw === 'number'
    ? featuredArticleIdRaw
    : typeof featuredArticleIdRaw === 'string'
      ? parseInt(featuredArticleIdRaw, 10)
      : undefined;
  const showFeaturedRecipe = config?.showFeaturedRecipe ?? config?.show_featured_recipe;
  const showHeroCta = config?.showHeroCta ?? config?.show_hero_cta;
  const heroCtaText = config?.heroCtaText ?? config?.hero_cta_text;
  const heroCtaLink = config?.heroCtaLink ?? config?.hero_cta_link;
  return {
    ...category,
    ...image,
    ...seo,
    imagesJson: safeParseJson(category.imagesJson),
    seoJson: safeParseJson(category.seoJson),
    route: `/categories/${category.slug}`,
    ...(typeof numEntriesPerPage === 'number' ? { numEntriesPerPage } : {}),
    ...(typeof tldr === 'string' ? { tldr } : {}),
    ...(layoutMode ? { layoutMode } : {}),
    ...(cardStyle ? { cardStyle } : {}),
    ...(typeof showInNav === 'boolean' ? { showInNav } : {}),
    ...(typeof showInFooter === 'boolean' ? { showInFooter } : {}),
    ...(typeof showSidebar === 'boolean' ? { showSidebar } : {}),
    ...(typeof showFilters === 'boolean' ? { showFilters } : {}),
    ...(typeof showBreadcrumb === 'boolean' ? { showBreadcrumb } : {}),
    ...(typeof showPagination === 'boolean' ? { showPagination } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(articleSortOrder ? { articleSortOrder } : {}),
    ...(headerStyle ? { headerStyle } : {}),
    ...(Number.isFinite(featuredArticleId) ? { featuredArticleId: featuredArticleId as number } : {}),
    ...(typeof showFeaturedRecipe === 'boolean' ? { showFeaturedRecipe } : {}),
    ...(typeof showHeroCta === 'boolean' ? { showHeroCta } : {}),
    ...(typeof heroCtaText === 'string' ? { heroCtaText } : {}),
    ...(typeof heroCtaLink === 'string' ? { heroCtaLink } : {}),
  };
}

/**
 * Hydrate an author with computed fields
 */
export function hydrateAuthor<T extends {
  imagesJson?: string | null;
  seoJson?: string | null;
  jobTitle?: string | null;
  slug: string;
}>(author: T) {
  const image = extractImage(author.imagesJson, 'avatar');
  const seo = extractSeo(author.seoJson);

  return {
    ...author,
    ...image,
    ...seo,
    imagesJson: safeParseJson(author.imagesJson),
    seoJson: safeParseJson(author.seoJson),
    job: author.jobTitle, // Alias for template compatibility
    route: `/authors/${author.slug}`,
  };
}

/**
 * Hydrate a tag with computed fields
 */
export function hydrateTag<T extends {
  styleJson?: string | null;
  slug: string;
}>(tag: T) {
  const style = extractTagStyle(tag.styleJson);

  return {
    ...tag,
    ...style,
    styleJson: safeParseJson(tag.styleJson),
    route: `/tags/${tag.slug}`,
  };
}

// ============================================================================
// Batch Hydration
// ============================================================================

export function hydrateArticles<T extends Parameters<typeof hydrateArticle>[0]>(
  articles: T[]
) {
  return articles.map(hydrateArticle);
}

export function hydrateCategories<T extends Parameters<typeof hydrateCategory>[0]>(
  categories: T[]
) {
  return categories.map(hydrateCategory);
}

export function hydrateAuthors<T extends Parameters<typeof hydrateAuthor>[0]>(
  authors: T[]
) {
  return authors.map(hydrateAuthor);
}

export function hydrateTags<T extends Parameters<typeof hydrateTag>[0]>(
  tags: T[]
) {
  return tags.map(hydrateTag);
}

// ============================================================================
// Hydrated Types (Use with Caution - Prefer module-specific types)
// ============================================================================

export type HydratedAuthor = ReturnType<typeof hydrateAuthor>;
export type HydratedTag = ReturnType<typeof hydrateTag>;
