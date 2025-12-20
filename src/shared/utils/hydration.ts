/**
 * Data Hydration Utilities
 * =========================
 * Functions to extract computed fields from JSON columns in database records.
 * These transform raw Drizzle types into enriched types with convenience fields.
 */

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

interface ImageVariant {
  url: string;
  width?: number;
  height?: number;
}

interface ImageSlot {
  alt?: string;
  variants?: {
    xs?: ImageVariant;
    sm?: ImageVariant;
    md?: ImageVariant;
    lg?: ImageVariant;
    original?: ImageVariant;
  };
}

interface ImagesJson {
  thumbnail?: ImageSlot;
  cover?: ImageSlot;
  avatar?: ImageSlot;
}

export interface ExtractedImage {
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}

/**
 * Extract image URL and metadata from imagesJson field
 * Prefers lg > md > sm > original > xs variants
 */
export function extractImage(
  imagesJson: string | null | undefined,
  slot: 'thumbnail' | 'cover' | 'avatar' = 'thumbnail'
): ExtractedImage {
  const images = safeParseJson<ImagesJson>(imagesJson);
  if (!images) return {};

  const imageSlot = images[slot];
  if (!imageSlot?.variants) return {};

  // Pick the best available variant
  const variant = 
    imageSlot.variants.lg ||
    imageSlot.variants.md ||
    imageSlot.variants.sm ||
    imageSlot.variants.original ||
    imageSlot.variants.xs;

  if (!variant) return {};

  return {
    imageUrl: variant.url,
    imageAlt: imageSlot.alt,
    imageWidth: variant.width,
    imageHeight: variant.height,
  };
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

export interface RecipeJson {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  servingSize?: string;
  difficulty?: string;
  calories?: number;
  cuisine?: string;
  course?: string;
  ingredients?: Array<{
    group_title?: string;
    items: Array<{
      name: string;
      amount?: string;
      unit?: string;
      notes?: string;
    }>;
  }>;
  instructions?: Array<{
    section_title?: string;
    steps: Array<{
      text: string;
      time?: number;
      tip?: string;
      image?: string | null;
    }>;
  }>;
}

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
  icon?: string;
  backgroundColor?: string;
}

export interface ExtractedTagStyle {
  color?: string;
  icon?: string;
  backgroundColor?: string;
}

/**
 * Extract tag styling from styleJson field
 */
export function extractTagStyle(styleJson: string | null | undefined): ExtractedTagStyle {
  const style = safeParseJson<TagStyleJson>(styleJson);
  if (!style) return {};

  return {
    color: style.color,
    icon: style.icon,
    backgroundColor: style.backgroundColor,
  };
}

// ============================================================================
// Entity Hydration Functions
// ============================================================================

/**
 * Hydrate an article with computed fields
 */

/**
 * Hydrate an article with computed fields
 */
export function hydrateArticle<T extends { 
  imagesJson?: string | null;
  seoJson?: string | null;
  recipeJson?: string | null;
  headline?: string;
  slug: string;
  type?: string;
}>(article: T) {
  const image = extractImage(article.imagesJson);
  const seo = extractSeo(article.seoJson);
  const recipe = extractRecipe(article.recipeJson);
  const route = article.type === 'recipe' ? `/recipes/${article.slug}` : `/articles/${article.slug}`;

  return {
    ...article,
    ...image,
    ...seo,
    recipeJson: recipe, // Replace string with parsed object for template access
    recipe, // Also available as recipe for clarity
    label: article.headline, // Alias for template compatibility
    route,
  };
}

/**
 * Hydrate a category with computed fields
 */
export function hydrateCategory<T extends {
  imagesJson?: string | null;
  seoJson?: string | null;
  slug: string;
}>(category: T) {
  const image = extractImage(category.imagesJson);
  const seo = extractSeo(category.seoJson);

  return {
    ...category,
    ...image,
    ...seo,
    route: `/categories/${category.slug}`,
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
