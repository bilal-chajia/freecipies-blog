/**
 * Categories Module - API Helpers
 * ================================
 * Helper functions for API endpoints to handle JSON transformations
 */

import type { CategoryImagesJson, ImageVariants } from '../../articles/types/images.types';

interface SeoJson {
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  canonical?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  robots?: string;
}

const getBestVariant = (variants?: ImageVariants) => {
  return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};

const normalizeImageSlot = (slot: any) => {
  if (!slot || typeof slot !== 'object') return slot;

  if (slot.variants && typeof slot.variants === 'object') {
    return slot;
  }

  if (slot.url) {
    return {
      ...slot,
      variants: {
        original: {
          url: slot.url,
          width: slot.width ?? 0,
          height: slot.height ?? 0,
        },
      },
    };
  }

  return slot;
};

const normalizeSeoJsonObject = (value: any): SeoJson => {
  if (!value || typeof value !== 'object') return {};

  return {
    metaTitle: value.metaTitle,
    metaDescription: value.metaDescription,
    noIndex: value.noIndex,
    canonical: value.canonical ?? value.canonicalUrl,
    ogImage: value.ogImage,
    ogTitle: value.ogTitle,
    ogDescription: value.ogDescription,
    twitterCard: value.twitterCard,
    robots: value.robots,
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
        thumbnail: normalizeImageSlot(images.thumbnail),
        cover: normalizeImageSlot(images.cover),
      };
      return JSON.stringify(normalized);
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    const normalized: CategoryImagesJson = {
      thumbnail: normalizeImageSlot(value.thumbnail),
      cover: normalizeImageSlot(value.cover),
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
 * Transform request body to handle both legacy flat fields and new JSON fields
 */
export function transformCategoryRequestBody(body: any): any {
  const transformed = { ...body };
  const hasLegacyImageFields = ['imageUrl', 'imageAlt', 'imageWidth', 'imageHeight']
    .some((key) => Object.prototype.hasOwnProperty.call(body, key));

  if (body.imagesJson !== undefined) {
    transformed.imagesJson = parseImagesJson(body.imagesJson);
  } else if (hasLegacyImageFields) {
    const images: CategoryImagesJson = {};
    if (body.imageUrl) {
      images.thumbnail = {
        alt: body.imageAlt,
        variants: {
          original: {
            url: body.imageUrl,
            width: body.imageWidth ?? 0,
            height: body.imageHeight ?? 0,
          },
        },
      };
    }
    transformed.imagesJson = JSON.stringify(images);
    delete transformed.imageUrl;
    delete transformed.imageAlt;
    delete transformed.imageWidth;
    delete transformed.imageHeight;
  }

  if (body.seoJson !== undefined) {
    transformed.seoJson = parseSeoJson(body.seoJson);
  } else if (
    body.metaTitle ||
    body.metaDescription ||
    body.canonicalUrl ||
    body.canonical ||
    body.ogImage ||
    body.ogTitle ||
    body.ogDescription ||
    body.twitterCard ||
    body.robots ||
    body.noIndex
  ) {
    transformed.seoJson = parseSeoJson({
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      canonical: body.canonical,
      canonicalUrl: body.canonicalUrl,
      ogImage: body.ogImage,
      ogTitle: body.ogTitle,
      ogDescription: body.ogDescription,
      twitterCard: body.twitterCard,
      robots: body.robots,
      noIndex: body.noIndex,
    });
  }

  return transformed;
}

/**
 * Transform category response to include legacy flat fields for backward compatibility
 */
export function transformCategoryResponse(category: any): any {
  if (!category) return category;

  const response = { ...category };

  if (category.imagesJson) {
    try {
      const images: CategoryImagesJson = JSON.parse(category.imagesJson);
      const primarySlot = images.thumbnail ?? images.cover;
      const variant = getBestVariant(primarySlot?.variants);
      response.imageUrl = variant?.url;
      response.imageAlt = primarySlot?.alt;
      response.imageWidth = variant?.width;
      response.imageHeight = variant?.height;
    } catch {
      // Invalid JSON, skip
    }
  }

  if (category.seoJson) {
    try {
      const seo: SeoJson = JSON.parse(category.seoJson);
      if (!response.metaTitle) response.metaTitle = seo.metaTitle;
      if (!response.metaDescription) response.metaDescription = seo.metaDescription;
      if (!response.canonicalUrl && seo.canonical) response.canonicalUrl = seo.canonical;
    } catch {
      // Invalid JSON, skip
    }
  }

  return response;
}
