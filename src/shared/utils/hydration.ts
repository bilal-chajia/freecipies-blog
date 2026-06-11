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

export function safeParseJson<T>(json: unknown): T | null {
  if (json === null || json === undefined || json === '') return null;
  try {
    return typeof json === 'string' ? JSON.parse(json) : (json as T);
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
  image_url?: string;
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
  images_json: string | null | undefined,
  slot: HydratableImageSlot = 'thumbnail'
): ImageSlot | null {
  const images = safeParseJson<ImagesJson>(images_json);
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
  images_json: string | null | undefined,
  slot: HydratableImageSlot = 'thumbnail'
): string {
  const imageSlot = getImageSlot(images_json, slot);
  if (!imageSlot) return '';
  return getSrcSet(imageSlot);
}

// pickVariantByWidth removed — use pickVariantByWidth(variants, targetWidth, 1) from @shared/types/images (C2)
// retinaMultiplier=1 preserves the previous hydration behavior (no 2× retina scaling)

/**
 * Extract image URL and metadata from images_json field
 * Uses the smallest variant that satisfies targetWidth (when provided),
 * otherwise prefers lg > md > sm > original > xs
 */
export function extractImage(
  images_json: string | null | undefined,
  slot: HydratableImageSlot = 'thumbnail',
  targetWidth?: number
): ExtractedImage {
  const images = safeParseJson<ImagesJson>(images_json);
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
      image_url: resolvedUrl,
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
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  canonical?: string;
  no_index?: boolean;
  twitter_card?: string;
  robots?: string;
}

export interface ExtractedSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  canonical?: string;
}

/**
 * Extract SEO metadata from seo_json field
 */
export function extractSeo(seo_json: string | null | undefined): ExtractedSeo {
  const seo = safeParseJson<SeoJson>(seo_json);
  if (!seo) return {};

  return {
    metaTitle: seo.meta_title ?? undefined,
    metaDescription: seo.meta_description ?? undefined,
    ogImage: seo.og_image ?? undefined,
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
export function extractRecipe(recipe_json: string | null | undefined): RecipeJson | null {
  const recipe = safeParseJson<RecipeJson>(recipe_json);
  if (!recipe) return null;
  return recipe;
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
 * Extract tag styling from style_json field
 */
export function extractTagStyle(style_json: string | null | undefined): ExtractedTagStyle {
  const style = safeParseJson<TagStyleJson>(style_json);
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
  images_json?: string | null;
  content_json?: string | null;
  recipe_json?: string | null;
  roundup_json?: string | null;
  faqs_json?: string | null;
  seo_json?: string | null;
  authorImagesJson?: string | null;
  cached_author_json?: string | null;
  cached_category_json?: string | null;
  cached_tags_json?: string | null;
  headline?: string;
  slug: string;
  type?: string;
  author?: {
    images_json?: string | null;
    name?: string | null;
    slug?: string | null;
    job_title?: string | null;
  } | null;
  authorName?: string | null;   // join input (admin getArticleById) — consumed, not re-emitted
  authorSlug?: string | null;
  authorJob?: string | null;
  category?: {
    label?: string | null;
    color?: string | null;
    slug?: string | null;
  } | null;
  categoryLabel?: string | null; // join input — consumed, not re-emitted
  categoryColor?: string | null;
  categorySlug?: string | null;
}>(article: T) {
  // Strip camelCase join inputs from the spread so they are never serialized.
  const {
    authorName: joinAuthorName,
    authorSlug: joinAuthorSlug,
    authorJob: joinAuthorJob,
    categoryLabel: joinCategoryLabel,
    categoryColor: joinCategoryColor,
    categorySlug: joinCategorySlug,
    authorImagesJson: joinAuthorImagesJson,
    ...articleRest
  } = article;

  const image = extractImage(article.images_json);

  const cachedAuthor = article.cached_author_json
    ? safeParseJson<any>(article.cached_author_json)
    : null;

  const cachedCategory = article.cached_category_json
    ? safeParseJson<any>(article.cached_category_json)
    : null;

  // Resolve author avatar URL (cards consume a URL; the slot stays in author.avatar)
  let authorAvatar = extractImage(joinAuthorImagesJson, 'avatar').image_url;

  if (!authorAvatar && cachedAuthor) {
    const avatarSlot = cachedAuthor?.avatar;
    if (typeof avatarSlot === 'string') {
      authorAvatar = avatarSlot;
    } else if (avatarSlot && typeof avatarSlot === 'object') {
      authorAvatar = resolveVariantUrl(avatarSlot.variants?.sm)
        || resolveVariantUrl(avatarSlot.variants?.xs)
        || (avatarSlot as any).url
        || null;
    }
  }

  if (!authorAvatar && article.author?.images_json) {
    authorAvatar = extractImage(article.author.images_json, 'avatar').image_url;
  }

  const authorName = joinAuthorName
    ?? cachedAuthor?.name
    ?? article.author?.name;
  const authorSlug = joinAuthorSlug
    ?? cachedAuthor?.slug
    ?? article.author?.slug;
  const authorRole = joinAuthorJob
    ?? cachedAuthor?.job_title
    ?? cachedAuthor?.role
    ?? article.author?.job_title;

  const categoryLabel = joinCategoryLabel
    ?? cachedCategory?.label
    ?? article.category?.label;
  const categoryColor = joinCategoryColor
    ?? cachedCategory?.color
    ?? article.category?.color;
  const categorySlug = joinCategorySlug
    ?? cachedCategory?.slug
    ?? article.category?.slug;

  const tags = article.cached_tags_json
    ? safeParseJson<any[]>(article.cached_tags_json) || []
    : [];

  const seo = extractSeo(article.seo_json);
  // Generate correct route based on article type
  const route = article.type === 'recipe'
    ? `/recipes/${article.slug}`
    : article.type === 'roundup'
      ? `/roundups/${article.slug}`
      : `/articles/${article.slug}`;

  // Nested objects are the single source of author/category data (snake-compliant).
  const author = (cachedAuthor || authorName || authorSlug || authorRole || authorAvatar)
    ? {
        ...(cachedAuthor ?? {}),
        name: authorName ?? null,
        slug: authorSlug ?? null,
        role: authorRole ?? null,
        job_title: authorRole ?? cachedAuthor?.job_title ?? null,
        avatar: cachedAuthor?.avatar ?? null,
        avatar_url: authorAvatar ?? null,
      }
    : null;

  const category = (cachedCategory || categoryLabel || categoryColor || categorySlug)
    ? {
        ...(cachedCategory ?? {}),
        label: categoryLabel ?? null,
        color: categoryColor ?? null,
        slug: categorySlug ?? null,
      }
    : null;

  return {
    ...articleRest,
    ...image,
    ...seo,
    content_json: safeParseJson(article.content_json),
    recipe_json: extractRecipe(article.recipe_json),
    recipe: extractRecipe(article.recipe_json), // Alias for RecipeContent.recipe
    roundup_json: safeParseJson(article.roundup_json),
    faqs_json: safeParseJson(article.faqs_json),
    route,
    author,
    category,
    tags,
  };
}

/**
 * Hydrate a category with computed fields
 */
interface CategorySeoJson {
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  canonical?: string;
  no_index?: boolean;
  twitter_card?: string;
}

interface CategoryPresentationJson {
  featured_article?: { id?: number; slug?: string; title?: string };
  tldr?: string;
  hero_cta?: { show?: boolean; text?: string; link?: string };
}

export function hydrateCategory<T extends {
  images_json?: string | null;
  seo_json?: string | null;
  presentation_json?: string | null;
  is_featured?: boolean | null;
  slug: string;
}>(category: T) {
  const image = extractImage(category.images_json);
  const seo = safeParseJson<CategorySeoJson>(category.seo_json);
  const presentation = safeParseJson<CategoryPresentationJson>(category.presentation_json) ?? {};
  const tldr = presentation.tldr;
  const featuredArticleId = presentation.featured_article?.id;
  const heroCta = presentation.hero_cta ?? {};
  return {
    ...category,
    ...image,
    ...(seo?.meta_title !== undefined ? { meta_title: seo.meta_title } : {}),
    ...(seo?.meta_description !== undefined ? { meta_description: seo.meta_description } : {}),
    ...(seo?.og_image !== undefined ? { og_image: seo.og_image } : {}),
    ...(seo?.og_title !== undefined ? { og_title: seo.og_title } : {}),
    ...(seo?.og_description !== undefined ? { og_description: seo.og_description } : {}),
    ...(seo?.canonical !== undefined ? { canonical: seo.canonical } : {}),
    ...(seo?.no_index !== undefined ? { no_index: seo.no_index } : {}),
    ...(seo?.twitter_card !== undefined ? { twitter_card: seo.twitter_card } : {}),
    images_json: safeParseJson(category.images_json),
    seo_json: safeParseJson(category.seo_json),
    route: `/categories/${category.slug}`,
    ...(typeof tldr === 'string' ? { tldr } : {}),
    ...(typeof featuredArticleId === 'number' ? { featured_article_id: featuredArticleId } : {}),
    ...(typeof heroCta.show === 'boolean' ? { show_hero_cta: heroCta.show } : {}),
    ...(typeof heroCta.text === 'string' ? { hero_cta_text: heroCta.text } : {}),
    ...(typeof heroCta.link === 'string' ? { hero_cta_link: heroCta.link } : {}),
  };
}

/**
 * Hydrate an author with computed fields
 */
export function hydrateAuthor<T extends {
  images_json?: string | null;
  seo_json?: string | null;
  job_title?: string | null;
  slug: string;
}>(author: T) {
  const image = extractImage(author.images_json, 'avatar');
  const seo = extractSeo(author.seo_json);

  return {
    ...author,
    ...image,
    ...seo,
    images_json: safeParseJson(author.images_json),
    seo_json: safeParseJson(author.seo_json),
    job: author.job_title, // Alias for template compatibility
    route: `/authors/${author.slug}`,
  };
}

/**
 * Hydrate a tag with computed fields
 */
export function hydrateTag<T extends {
  style_json?: string | null;
  slug: string;
}>(tag: T) {
  const style = extractTagStyle(tag.style_json);

  return {
    ...tag,
    ...style,
    style_json: safeParseJson(tag.style_json),
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
