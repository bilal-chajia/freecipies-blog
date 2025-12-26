/**
 * Authors Module - TypeScript Types
 * ====================================
 * Type definitions for Authors JSON fields
 */

import type { AuthorImagesJson, ImageVariants } from '../../articles/types/images.types';

// ============================================
// Images JSON Structure
// ============================================

export type ImagesJson = AuthorImagesJson;

// ============================================
// Bio JSON Structure
// ============================================

export interface BioSocialLink {
  network: string;
  url: string;
  label?: string;
}

export interface LegacyBioFields {
  headline?: string;
  subtitle?: string;
  introduction?: string;
  fullBio?: string;
  expertise?: string[];
  socialLinks?: Record<string, string>;
}

export interface BioJson extends LegacyBioFields {
  short?: string;
  long?: string;
  socials?: BioSocialLink[];
}

// ============================================
// SEO JSON Structure
// ============================================

export interface SeoJson {
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

// ============================================
// Flat Author Fields (Legacy/Backward Compat)
// ============================================

export interface FlatAuthorImages {
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

export interface FlatAuthorSeo {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

// ============================================
// Conversion Utilities
// ============================================

const getBestVariant = (variants?: ImageVariants) => {
  return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};

/**
 * Convert flat image fields to ImagesJson structure
 */
export function flatToImagesJson(flat: FlatAuthorImages): string {
  const images: ImagesJson = {};

  if (flat.imageUrl) {
    images.avatar = {
      alt: flat.imageAlt || undefined,
      variants: {
        original: {
          url: flat.imageUrl,
          width: flat.imageWidth ?? 0,
          height: flat.imageHeight ?? 0,
        },
      },
    };
  }

  return JSON.stringify(images);
}

/**
 * Convert ImagesJson to flat fields (extract avatar only for backward compat)
 */
export function imagesJsonToFlat(imagesJson: string | null): FlatAuthorImages {
  if (!imagesJson) return {};

  try {
    const images: ImagesJson = JSON.parse(imagesJson);
    const avatar = images.avatar;
    const variant = getBestVariant(avatar?.variants);
    return {
      imageUrl: variant?.url || null,
      imageAlt: avatar?.alt || null,
      imageWidth: variant?.width ?? null,
      imageHeight: variant?.height ?? null,
    };
  } catch {
    return {};
  }
}

/**
 * Convert flat SEO fields to SeoJson structure
 */
export function flatToSeoJson(flat: FlatAuthorSeo): string {
  const seo: SeoJson = {
    metaTitle: flat.metaTitle,
    metaDescription: flat.metaDescription,
    canonical: flat.canonicalUrl,
  };

  return JSON.stringify(seo);
}

/**
 * Convert SeoJson to flat fields
 */
export function seoJsonToFlat(seoJson: string | null): FlatAuthorSeo {
  if (!seoJson) return {};

  try {
    const seo: SeoJson = JSON.parse(seoJson);
    return {
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDescription,
      canonicalUrl: seo.canonical,
    };
  } catch {
    return {};
  }
}

/**
 * Validate and sanitize ImagesJson
 */
export function validateImagesJson(imagesJson: string | null): ImagesJson | null {
  if (!imagesJson) return null;

  try {
    const images = JSON.parse(imagesJson);
    // Basic validation
    if (typeof images !== 'object') return null;
    return images as ImagesJson;
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize BioJson
 */
export function validateBioJson(bioJson: string | null): BioJson | null {
  if (!bioJson) return null;

  try {
    const bio = JSON.parse(bioJson);
    if (typeof bio !== 'object') return null;
    return bio as BioJson;
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize SeoJson
 */
export function validateSeoJson(seoJson: string | null): SeoJson | null {
  if (!seoJson) return null;

  try {
    const seo = JSON.parse(seoJson);
    if (typeof seo !== 'object') return null;
    return seo as SeoJson;
  } catch {
    return null;
  }
}
