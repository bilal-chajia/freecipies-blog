/**
 * Categories Module - API Helpers
 * ================================
 * Helper functions for API endpoints to handle JSON transformations
 */

import type { CategoryImagesJson, ImageVariants } from '../../articles/types/images.types';
import { resolveVariantUrl } from '@shared/types/images';

interface SeoJson {
  meta_title?: string | null;
  meta_description?: string | null;
  no_index?: boolean;
  canonical?: string;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_card?: 'summary' | 'summary_large_image';
}

interface ConfigJson {
  posts_per_page?: number;
  tldr?: string;
  show_in_nav?: boolean;
  show_in_footer?: boolean;
  layout_mode?: 'grid' | 'list' | 'masonry';
  card_style?: 'compact' | 'full' | 'minimal';
  show_sidebar?: boolean;
  show_filters?: boolean;
  show_breadcrumb?: boolean;
  show_pagination?: boolean;
  article_sort_by?: 'published_at' | 'title' | 'view_count';
  article_sort_order?: 'asc' | 'desc';
  header_style?: 'hero' | 'minimal' | 'none';
  featured_article_id?: number;
  show_featured_recipe?: boolean;
  show_hero_cta?: boolean;
  hero_cta_text?: string;
  hero_cta_link?: string;
}

const getBestVariant = (variants?: ImageVariants) => {
  return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};

const extractR2KeyFromUrl = (url: string): string | null => {
  if (!url) return null;
  const proxyMatch = url.match(/^\/api\/images\/(.+)$/);
  if (proxyMatch) return proxyMatch[1];
  const r2Match = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i);
  if (r2Match) return r2Match[1];
  const localMatch = url.match(/^https?:\/\/[^\/]+\/api\/images\/(.+)$/);
  if (localMatch) return localMatch[1];
  return null;
};

const normalizeImageVariant = (variant: any) => {
  if (!variant || typeof variant !== 'object') return undefined;
  const r2Key = typeof variant.r2_key === 'string'
    ? variant.r2_key
    : typeof variant.url === 'string'
      ? extractR2KeyFromUrl(variant.url)
      : null;
  const width = Number(variant.width);
  const height = Number(variant.height);
  if (!r2Key || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return undefined;
  return {
    r2_key: r2Key,
    width,
    height,
    ...(Number.isFinite(Number(variant.size_bytes))
      ? { size_bytes: Number(variant.size_bytes) }
      : {}),
  };
};

const normalizeImageSlot = (slot: any, variantKeys: string[], fallbackAspectRatio: string) => {
  if (!slot || typeof slot !== 'object') return slot;

  const sourceVariants = slot.variants && typeof slot.variants === 'object' ? slot.variants : {};
  if (slot.url && Object.keys(sourceVariants).length === 0) {
    const r2Key = extractR2KeyFromUrl(slot.url);
    for (const key of variantKeys) {
      sourceVariants[key] = {
        ...(r2Key ? { r2_key: r2Key } : {}),
        width: slot.width ?? 0,
        height: slot.height ?? 0,
      };
    }
  }

  const variants: Record<string, unknown> = {};
  for (const key of variantKeys) {
    const normalized = normalizeImageVariant(sourceVariants[key]);
    if (normalized) variants[key] = normalized;
  }

  return {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    alt: typeof slot.alt === 'string' ? slot.alt : '',
    placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
    aspect_ratio: typeof slot.aspect_ratio === 'string'
      ? slot.aspect_ratio
      : fallbackAspectRatio,
    ...(slot.focal_point && typeof slot.focal_point === 'object' ? { focal_point: slot.focal_point } : {}),
    variants,
  };
};

const normalizeSeoJsonObject = (value: any): SeoJson => {
  if (!value || typeof value !== 'object') return {};

  return {
    meta_title: value.meta_title ?? null,
    meta_description: value.meta_description ?? null,
    no_index: Boolean(value.no_index ?? false),
    canonical: value.canonical,
    og_image: value.og_image ?? null,
    og_title: value.og_title ?? null,
    og_description: value.og_description ?? null,
    twitter_card: value.twitter_card ?? 'summary_large_image',
  };
};

const normalizeConfigJsonObject = (value: any): ConfigJson => {
  if (!value || typeof value !== 'object') return {};

  const featuredArticleIdRaw = value.featured_article_id;
  const featuredArticleId = typeof featuredArticleIdRaw === 'number'
    ? featuredArticleIdRaw
    : typeof featuredArticleIdRaw === 'string'
      ? parseInt(featuredArticleIdRaw, 10)
      : undefined;
  const normalized: ConfigJson = {};

  if (typeof value.posts_per_page === 'number') normalized.posts_per_page = value.posts_per_page;
  if (typeof value.tldr === 'string') normalized.tldr = value.tldr;
  if (typeof value.show_in_nav === 'boolean') normalized.show_in_nav = value.show_in_nav;
  if (typeof value.show_in_footer === 'boolean') normalized.show_in_footer = value.show_in_footer;
  if (typeof value.layout_mode === 'string') normalized.layout_mode = value.layout_mode as ConfigJson['layout_mode'];
  if (typeof value.card_style === 'string') normalized.card_style = value.card_style as ConfigJson['card_style'];
  if (typeof value.show_sidebar === 'boolean') normalized.show_sidebar = value.show_sidebar;
  if (typeof value.show_filters === 'boolean') normalized.show_filters = value.show_filters;
  if (typeof value.show_breadcrumb === 'boolean') normalized.show_breadcrumb = value.show_breadcrumb;
  if (typeof value.show_pagination === 'boolean') normalized.show_pagination = value.show_pagination;
  if (typeof value.article_sort_by === 'string') normalized.article_sort_by = value.article_sort_by as ConfigJson['article_sort_by'];
  if (typeof value.article_sort_order === 'string') normalized.article_sort_order = value.article_sort_order as ConfigJson['article_sort_order'];
  if (typeof value.header_style === 'string') normalized.header_style = value.header_style as ConfigJson['header_style'];
  if (Number.isFinite(featuredArticleId)) normalized.featured_article_id = featuredArticleId as number;
  if (typeof value.show_featured_recipe === 'boolean') normalized.show_featured_recipe = value.show_featured_recipe;
  if (typeof value.show_hero_cta === 'boolean') normalized.show_hero_cta = value.show_hero_cta;
  if (typeof value.hero_cta_text === 'string') normalized.hero_cta_text = value.hero_cta_text;
  if (typeof value.hero_cta_link === 'string') normalized.hero_cta_link = value.hero_cta_link;

  return normalized;
};

const parseConfigJsonValue = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
};

/**
 * Parse and validate ImagesJson from request body
 */
export function parseImagesJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      const images = typeof parsed === 'object' && parsed ? parsed : {};
      const normalized: CategoryImagesJson = {
        thumbnail: normalizeImageSlot(images.thumbnail, ['xs', 'sm'], '1:1'),
        hero: normalizeImageSlot(images.hero, ['sm', 'md', 'lg'], '16:9'),
      };
      return JSON.stringify(normalized);
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    const normalized: CategoryImagesJson = {
      thumbnail: normalizeImageSlot(value.thumbnail, ['xs', 'sm'], '1:1'),
      hero: normalizeImageSlot(value.hero, ['sm', 'md', 'lg'], '16:9'),
    };
    return JSON.stringify(normalized);
  }

  return '{}';
}

/**
 * Parse and validate SeoJson from request body
 */
export function parseSeoJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeSeoJsonObject(parsed));
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(normalizeSeoJsonObject(value));
  }

  return '{}';
}

/**
 * Parse and validate ConfigJson from request body
 */
export function parseConfigJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeConfigJsonObject(parsed));
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(normalizeConfigJsonObject(value));
  }

  return '{}';
}

/**
 * Transform request body to handle both legacy flat fields and new JSON fields
 */
export function transformCategoryRequestBody(body: any): any {
  const transformed = { ...body };
  const hasLegacyImageFields = ['image_url', 'imageAlt', 'imageWidth', 'imageHeight']
    .some((key) => Object.prototype.hasOwnProperty.call(body, key));
  const configOverrides: Record<string, any> = {};

  if (body.numEntriesPerPage !== undefined) {
    configOverrides.posts_per_page = body.numEntriesPerPage;
    delete transformed.numEntriesPerPage;
  }
  if (body.postsPerPage !== undefined) {
    configOverrides.posts_per_page = body.postsPerPage;
    delete transformed.postsPerPage;
  }
  if (body.tldr !== undefined) {
    configOverrides.tldr = body.tldr;
    delete transformed.tldr;
  }
  if (body.showInNav !== undefined) {
    configOverrides.show_in_nav = body.showInNav;
    delete transformed.showInNav;
  }
  if (body.showInFooter !== undefined) {
    configOverrides.show_in_footer = body.showInFooter;
    delete transformed.showInFooter;
  }
  if (body.layout !== undefined) {
    configOverrides.layout_mode = body.layout;
    delete transformed.layout;
  }
  if (body.layoutMode !== undefined) {
    configOverrides.layout_mode = body.layoutMode;
    delete transformed.layoutMode;
  }
  if (body.cardStyle !== undefined) {
    configOverrides.card_style = body.cardStyle;
    delete transformed.cardStyle;
  }
  if (body.showSidebar !== undefined) {
    configOverrides.show_sidebar = body.showSidebar;
    delete transformed.showSidebar;
  }
  if (body.showFilters !== undefined) {
    configOverrides.show_filters = body.showFilters;
    delete transformed.showFilters;
  }
  if (body.showBreadcrumb !== undefined) {
    configOverrides.show_breadcrumb = body.showBreadcrumb;
    delete transformed.showBreadcrumb;
  }
  if (body.showPagination !== undefined) {
    configOverrides.show_pagination = body.showPagination;
    delete transformed.showPagination;
  }
  if (body.sortBy !== undefined) {
    configOverrides.article_sort_by = body.sortBy;
    delete transformed.sortBy;
  }
  if (body.sort_order !== undefined) {
    configOverrides.article_sort_order = body.sort_order;
    delete transformed.sort_order;
  }
  if (body.headerStyle !== undefined) {
    configOverrides.header_style = body.headerStyle;
    delete transformed.headerStyle;
  }
  if (body.featuredArticleId !== undefined) {
    const parsed = typeof body.featuredArticleId === 'string'
      ? parseInt(body.featuredArticleId, 10)
      : body.featuredArticleId;
    configOverrides.featured_article_id = Number.isFinite(parsed) ? parsed : null;
    delete transformed.featuredArticleId;
  }
  if (body.showFeaturedRecipe !== undefined) {
    configOverrides.show_featured_recipe = body.showFeaturedRecipe;
    delete transformed.showFeaturedRecipe;
  }
  if (body.showHeroCta !== undefined) {
    configOverrides.show_hero_cta = body.showHeroCta;
    delete transformed.showHeroCta;
  }
  if (body.heroCtaText !== undefined) {
    configOverrides.hero_cta_text = body.heroCtaText;
    delete transformed.heroCtaText;
  }
  if (body.heroCtaLink !== undefined) {
    configOverrides.hero_cta_link = body.heroCtaLink;
    delete transformed.heroCtaLink;
  }

  if (body.images_json !== undefined) {
    transformed.images_json = parseImagesJson(body.images_json);
  } else if (hasLegacyImageFields) {
    const images: Partial<Record<'thumbnail', unknown>> = {};
    if (body.image_url) {
      const r2Key = extractR2KeyFromUrl(body.image_url);
      images.thumbnail = {
        alt: body.imageAlt,
        url: r2Key ? `/api/images/${r2Key}` : body.image_url,
        width: body.imageWidth ?? 0,
        height: body.imageHeight ?? 0,
      };
    }
    transformed.images_json = JSON.stringify(images);
    delete transformed.image_url;
    delete transformed.imageAlt;
    delete transformed.imageWidth;
    delete transformed.imageHeight;
  }

  if (body.seo_json !== undefined) {
    transformed.seo_json = parseSeoJson(body.seo_json);
  } else if (
    body.metaTitle !== undefined ||
    body.metaDescription !== undefined ||
    body.canonicalUrl !== undefined ||
    body.canonical !== undefined ||
    body.ogImage !== undefined ||
    body.ogTitle !== undefined ||
    body.ogDescription !== undefined ||
    body.twitterCard !== undefined ||
    body.robots !== undefined ||
    body.noIndex !== undefined
  ) {
    transformed.seo_json = parseSeoJson({
      meta_title: body.metaTitle,
      meta_description: body.metaDescription,
      canonical: body.canonical ?? body.canonicalUrl,
      og_image: body.ogImage,
      og_title: body.ogTitle,
      og_description: body.ogDescription,
      twitter_card: body.twitterCard,
      robots: body.robots,
      no_index: body.noIndex,
    });
  }

  const existingConfig = body.config_json !== undefined
    ? JSON.parse(parseConfigJson(body.config_json))
    : {};
  const mergedConfig = {
    ...existingConfig,
    ...configOverrides,
  };
  if (Object.keys(mergedConfig).length > 0) {
    transformed.config_json = JSON.stringify(mergedConfig);
  } else {
    delete transformed.config_json;
  }

  // Basic required field validation REMOVED to allow partial updates (PATCH)
  // The database schema or specialized Creation validation should handle requirements.
  /*
  const missing: string[] = [];
  if (!transformed.slug) missing.push('slug');
  if (!transformed.label) missing.push('label');
  if (!transformed.short_description) missing.push('short_description');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    (error as any).code = 'VALIDATION_ERROR';
    throw error;
  }
  */

  // Clean up any flat fields from admin form that are NOT
  // actual DB columns — they would cause Drizzle to fail silently.
  const dbColumns = new Set([
    'slug', 'label', 'parent_id', 'depth', 'headline', 'collection_title',
    'short_description', 'images_json', 'color', 'is_featured',
    'seo_json', 'config_json', 'sort_order', 'workflow_status',
    'cached_post_count', 'created_at', 'updated_at', 'deleted_at',
  ]);
  for (const key of Object.keys(transformed)) {
    if (!dbColumns.has(key)) {
      delete transformed[key];
    }
  }

  return transformed;
}

export function transformCategoryResponse(category: any): any {
  if (!category) return category;

  const response = { ...category };

  if (category.images_json) {
    try {
      const images: CategoryImagesJson = JSON.parse(category.images_json);
      const primarySlot = images.thumbnail ?? images.hero;
      const variant = getBestVariant(primarySlot?.variants);
      response.image_url = resolveVariantUrl(variant);
      response.imageAlt = primarySlot?.alt;
      response.imageWidth = variant?.width;
      response.imageHeight = variant?.height;
    } catch {
    }
  }

  if (category.seo_json) {
    try {
      const seo: SeoJson = JSON.parse(category.seo_json);
      if (response.meta_title === undefined && seo.meta_title !== undefined) response.meta_title = seo.meta_title ?? undefined;
      if (response.meta_description === undefined && seo.meta_description !== undefined) response.meta_description = seo.meta_description ?? undefined;
      if (response.canonical === undefined && seo.canonical !== undefined) response.canonical = seo.canonical;
      if (response.og_image === undefined && seo.og_image !== undefined) response.og_image = seo.og_image;
      if (response.og_title === undefined && seo.og_title !== undefined) response.og_title = seo.og_title;
      if (response.og_description === undefined && seo.og_description !== undefined) response.og_description = seo.og_description;
      if (response.twitter_card === undefined && seo.twitter_card !== undefined) response.twitter_card = seo.twitter_card;
      if (response.no_index === undefined && seo.no_index !== undefined) response.no_index = seo.no_index;
    } catch {
      // Invalid JSON, skip
    }
  }

  if (category.config_json) {
    try {
      const config: ConfigJson = JSON.parse(category.config_json);
      if (response.posts_per_page === undefined && typeof config.posts_per_page === 'number') {
        response.posts_per_page = config.posts_per_page;
      }
      if (response.tldr === undefined && typeof config.tldr === 'string') {
        response.tldr = config.tldr;
      }
      if (response.show_in_nav === undefined && typeof config.show_in_nav === 'boolean') {
        response.show_in_nav = config.show_in_nav;
      }
      if (response.show_in_footer === undefined && typeof config.show_in_footer === 'boolean') {
        response.show_in_footer = config.show_in_footer;
      }
      if (response.layout_mode === undefined && typeof config.layout_mode === 'string') {
        response.layout_mode = config.layout_mode;
      }
      if (response.card_style === undefined && typeof config.card_style === 'string') {
        response.card_style = config.card_style;
      }
      if (response.show_sidebar === undefined && typeof config.show_sidebar === 'boolean') {
        response.show_sidebar = config.show_sidebar;
      }
      if (response.show_filters === undefined && typeof config.show_filters === 'boolean') {
        response.show_filters = config.show_filters;
      }
      if (response.show_breadcrumb === undefined && typeof config.show_breadcrumb === 'boolean') {
        response.show_breadcrumb = config.show_breadcrumb;
      }
      if (response.show_pagination === undefined && typeof config.show_pagination === 'boolean') {
        response.show_pagination = config.show_pagination;
      }
      if (typeof config.article_sort_by === 'string') {
        response.article_sort_by = config.article_sort_by;
      }
      if (typeof config.article_sort_order === 'string') {
        response.article_sort_order = config.article_sort_order;
      }
      if (response.header_style === undefined && typeof config.header_style === 'string') {
        response.header_style = config.header_style;
      }
      if (response.featured_article_id === undefined && typeof config.featured_article_id === 'number') {
        response.featured_article_id = config.featured_article_id;
      }
      if (response.show_featured_recipe === undefined && typeof config.show_featured_recipe === 'boolean') {
        response.show_featured_recipe = config.show_featured_recipe;
      }
      if (response.show_hero_cta === undefined && typeof config.show_hero_cta === 'boolean') {
        response.show_hero_cta = config.show_hero_cta;
      }
      if (response.hero_cta_text === undefined && typeof config.hero_cta_text === 'string') {
        response.hero_cta_text = config.hero_cta_text;
      }
      if (response.hero_cta_link === undefined && typeof config.hero_cta_link === 'string') {
        response.hero_cta_link = config.hero_cta_link;
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return response;
}
