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
  ImageSlotName,
} from '@shared/types/images';

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

// ImageVariant and ImageSlot imported from @shared/types/images

interface ImagesJson {
  thumbnail?: ImageSlot;
  cover?: ImageSlot;
  avatar?: ImageSlot;
  banner?: ImageSlot;
  pinterest?: ImageSlot;
}

export interface ExtractedImage {
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export function getImageSlot(
  imagesJson: string | null | undefined,
  slot: 'thumbnail' | 'cover' | 'avatar' | 'banner' | 'pinterest' = 'thumbnail'
): ImageSlot | null {
  const images = safeParseJson<ImagesJson>(imagesJson);
  if (!images) return null;
  return images[slot] || null;
}

const LOCAL_IMAGE_HOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

const normalizeImageUrl = (url?: string): string | undefined => {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed || !LOCAL_IMAGE_HOST_RE.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed.replace(LOCAL_IMAGE_HOST_RE, '');
  }
};

const buildSrcSet = (variants?: ImageSlot['variants']): string => {
  if (!variants) return '';
  const entries: string[] = [];
  const ordered = ['xs', 'sm', 'md', 'lg', 'original'] as const;

  for (const key of ordered) {
    const variant = variants[key];
    const normalizedUrl = normalizeImageUrl(variant?.url);
    if (normalizedUrl && variant?.width) {
      entries.push(`${normalizedUrl} ${variant.width}w`);
    }
  }

  return entries.join(', ');
};

export function getImageSrcSet(
  imagesJson: string | null | undefined,
  slot: 'thumbnail' | 'cover' | 'avatar' | 'banner' | 'pinterest' = 'thumbnail'
): string {
  const imageSlot = getImageSlot(imagesJson, slot);
  if (!imageSlot?.variants) return '';
  return buildSrcSet(imageSlot.variants);
}

const FALLBACK_VARIANT_ORDER = ['lg', 'md', 'sm', 'original', 'xs'] as const;
const FALLBACK_VARIANT_ORDER_FOR_TARGET = ['xs', 'sm', 'md', 'lg', 'original'] as const;

const pickVariantByWidth = (
  variants: ImageSlot['variants'],
  targetWidth?: number
): ImageVariant | null => {
  if (!variants) return null;

  const entries = Object.entries(variants)
    .filter(([, variant]) => variant && typeof variant.url === 'string')
    .map(([key, variant]) => ({ key, ...(variant as ImageVariant) }));

  if (!entries.length) return null;

  const withWidth = entries
    .filter((variant) => typeof variant.width === 'number' && (variant.width || 0) > 0)
    .sort((a, b) => (a.width || 0) - (b.width || 0));

  if (targetWidth && withWidth.length > 0) {
    const match = withWidth.find((variant) => (variant.width || 0) >= targetWidth);
    return (match || withWidth[withWidth.length - 1]) || null;
  }

  const fallbackOrder = targetWidth ? FALLBACK_VARIANT_ORDER_FOR_TARGET : FALLBACK_VARIANT_ORDER;

  for (const key of fallbackOrder) {
    const candidate = variants[key];
    if (candidate?.url) return candidate;
  }

  return entries[0] || null;
};

/**
 * Extract image URL and metadata from imagesJson field
 * Uses the smallest variant that satisfies targetWidth (when provided),
 * otherwise prefers lg > md > sm > original > xs
 */
export function extractImage(
  imagesJson: string | null | undefined,
  slot: 'thumbnail' | 'cover' | 'avatar' | 'banner' | 'pinterest' = 'thumbnail',
  targetWidth?: number
): ExtractedImage {
  const images = safeParseJson<ImagesJson>(imagesJson);
  if (!images) return {};

  const imageSlot = images[slot];
  if (!imageSlot) return {};

  const variant = pickVariantByWidth(imageSlot.variants, targetWidth);
  const normalizedVariantUrl = normalizeImageUrl(variant?.url);
  if (normalizedVariantUrl && variant) {
    return {
      imageUrl: normalizedVariantUrl,
      imageAlt: imageSlot.alt,
      imageWidth: variant.width,
      imageHeight: variant.height,
    };
  }

  const normalizedSlotUrl = normalizeImageUrl(imageSlot.url);
  if (normalizedSlotUrl) {
    return {
      imageUrl: normalizedSlotUrl,
      imageAlt: imageSlot.alt,
      imageWidth: imageSlot.width,
      imageHeight: imageSlot.height,
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
  svg_code?: string;
  color?: string;
  variant?: string;
}

export interface ExtractedTagStyle {
  color?: string;
  icon?: string;
  svgCode?: string;
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
    icon: style.svg_code,
    svgCode: style.svg_code,
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
  headline?: string;
  slug: string;
  type?: string;
}>(article: T) {
  const image = extractImage(article.imagesJson);

  const cachedAuthor = article.cachedAuthorJson
    ? safeParseJson<any>(article.cachedAuthorJson)
    : null;

  // Support multiple author source formats
  let authorAvatar = extractImage(article.authorImagesJson, 'avatar').imageUrl;

  if (!authorAvatar && cachedAuthor) {
    authorAvatar = cachedAuthor?.avatar;
  }

  if (!authorAvatar && (article as any).author?.imagesJson) {
    authorAvatar = extractImage((article as any).author.imagesJson, 'avatar').imageUrl;
  }
  authorAvatar = normalizeImageUrl(authorAvatar);

  const authorName = (article as any).authorName
    ?? cachedAuthor?.name
    ?? (article as any).author?.name;
  const authorSlug = (article as any).authorSlug
    ?? cachedAuthor?.slug
    ?? (article as any).author?.slug;

  const seo = extractSeo(article.seoJson);
  const route = article.type === 'recipe' ? `/recipes/${article.slug}` : `/articles/${article.slug}`;

  return {
    ...article,
    ...image,
    ...seo,
    contentJson: safeParseJson(article.contentJson),
    recipeJson: safeParseJson(article.recipeJson),
    roundupJson: safeParseJson(article.roundupJson),
    faqsJson: safeParseJson(article.faqsJson),
    label: article.headline, // Alias for UI consistency
    route,
    authorAvatar,
    ...(typeof authorName === 'string' ? { authorName } : {}),
    ...(typeof authorSlug === 'string' ? { authorSlug } : {}),
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
  const sortOrder = config?.sortOrder;
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
  const rawIconSvg = (category as any).iconSvg
    ?? (category as any).icon_svg
    ?? config?.iconSvg
    ?? config?.icon_svg;
  const iconSvg = typeof rawIconSvg === 'string' && rawIconSvg.trim()
    ? rawIconSvg.trim()
    : undefined;

  return {
    ...category,
    ...image,
    ...seo,
    imagesJson: safeParseJson(category.imagesJson),
    seoJson: safeParseJson(category.seoJson),
    route: `/categories/${category.slug}`,
    ...(iconSvg ? { iconSvg } : {}),
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
    ...(sortOrder ? { sortOrder } : {}),
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
// Hydrated Types
// ============================================================================

export type HydratedArticle = ReturnType<typeof hydrateArticle>;
export type HydratedCategory = ReturnType<typeof hydrateCategory>;
export type HydratedAuthor = ReturnType<typeof hydrateAuthor>;
export type HydratedTag = ReturnType<typeof hydrateTag>;
