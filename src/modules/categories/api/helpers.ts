/**
 * Categories Module - API Helpers
 * ================================
 * Helper functions for API endpoints to handle JSON transformations
 */

import type { CategoryImagesJson, ImageVariants } from '../../articles/types/images.types';
import { resolveVariantUrl } from '@shared/types/images';
import { parsePresentationJson } from './presentation';

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

  if (body.presentation_json !== undefined) {
    transformed.presentation_json = parsePresentationJson(body.presentation_json);
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
    'seo_json', 'presentation_json', 'sort_order', 'workflow_status',
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

  return response;
}
