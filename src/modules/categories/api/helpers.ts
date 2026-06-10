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
 * Transform request body: normalize the canonical snake_case JSON fields.
 */
export function transformCategoryRequestBody(body: any): any {
  const transformed = { ...body };

  if (body.images_json !== undefined) {
    transformed.images_json = parseImagesJson(body.images_json);
  }

  if (body.seo_json !== undefined) {
    transformed.seo_json = parseSeoJson(body.seo_json);
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

/**
 * Resolve a stored image slot for API output: variants carry a public `url`
 * (round-trips through parseImagesJson, which re-extracts the r2_key on save).
 */
const resolveSlotForResponse = (slot: any) => {
  if (!slot || typeof slot !== 'object') return undefined;
  const variants: Record<string, { url: string; width?: number; height?: number }> = {};
  const sourceVariants = slot.variants && typeof slot.variants === 'object' ? slot.variants : {};
  for (const [key, variant] of Object.entries(sourceVariants)) {
    const url = resolveVariantUrl(variant as { r2_key?: string; url?: string });
    if (!url) continue;
    const v = variant as { width?: number; height?: number };
    variants[key] = {
      url,
      ...(typeof v.width === 'number' ? { width: v.width } : {}),
      ...(typeof v.height === 'number' ? { height: v.height } : {}),
    };
  }
  return {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    alt: typeof slot.alt === 'string' ? slot.alt : '',
    ...(typeof slot.placeholder === 'string' && slot.placeholder ? { placeholder: slot.placeholder } : {}),
    ...(typeof slot.aspect_ratio === 'string' ? { aspect_ratio: slot.aspect_ratio } : {}),
    ...(slot.focal_point && typeof slot.focal_point === 'object' ? { focal_point: slot.focal_point } : {}),
    variants,
  };
};

export function transformCategoryResponse(category: any): any {
  if (!category) return category;

  const response = { ...category };

  if (category.images_json) {
    try {
      const images: CategoryImagesJson = JSON.parse(category.images_json);
      const primarySlot = images.thumbnail ?? images.hero;
      const variant = getBestVariant(primarySlot?.variants);
      response.image_url = resolveVariantUrl(variant);
      // Never ship raw r2_key to the frontend: re-emit images_json resolved.
      const resolved: Record<string, unknown> = {};
      const thumbnail = resolveSlotForResponse(images.thumbnail);
      const hero = resolveSlotForResponse(images.hero);
      if (thumbnail) resolved.thumbnail = thumbnail;
      if (hero) resolved.hero = hero;
      response.images_json = JSON.stringify(resolved);
    } catch {
    }
  }

  if (category.presentation_json) {
    try {
      const presentation = JSON.parse(category.presentation_json);
      const featured = presentation?.featured_article;
      if (featured && typeof featured === 'object' && featured.image) {
        const resolved = resolveSlotForResponse(featured.image);
        if (resolved && Object.keys(resolved.variants).length > 0) {
          featured.image = resolved;
        } else {
          delete featured.image;
        }
      }
      response.presentation_json = JSON.stringify(presentation);
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
