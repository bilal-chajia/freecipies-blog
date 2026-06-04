/**
 * Authors Module - TypeScript Types
 * ====================================
 * Type definitions for Authors JSON fields
 */

import type { AuthorImagesJson, ImageVariants } from '../../articles/types/images.types';
import { resolveVariantUrl } from '@shared/types/images';

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
  content?: {
    blocks?: unknown[];
  };
  socials?: BioSocialLink[];
}

export interface PersonaJson {
  voice?: string;
  audience?: string;
  point_of_view?: string;
  expertise?: string[];
  avoid?: string[];
}

// ============================================
// SEO JSON Structure
// ============================================

export interface SeoJson {
  meta_title?: string | null;
  meta_description?: string | null;
  no_index?: boolean;
  canonical?: string;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_card?: 'summary' | 'summary_large_image';
}

// ============================================
// Flat Author Fields (Legacy/Backward Compat)
// ============================================

export interface FlatAuthorImages {
  image_url?: string | null;
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

  if (flat.image_url) {
    images.avatar = {
      alt: flat.imageAlt || undefined,
      variants: {
        original: {
          url: flat.image_url,
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
export function imagesJsonToFlat(images_json: string | null): FlatAuthorImages {
  if (!images_json) return {};

  try {
    const images: ImagesJson = JSON.parse(images_json);
    const avatar = images.avatar;
    const variant = getBestVariant(avatar?.variants);
    return {
      image_url: resolveVariantUrl(variant) || null,
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
    meta_title: flat.metaTitle ?? null,
    meta_description: flat.metaDescription ?? null,
    no_index: false,
    canonical: flat.canonicalUrl,
    og_image: null,
    og_title: null,
    og_description: null,
    twitter_card: 'summary_large_image',
  };

  return JSON.stringify(seo);
}

/**
 * Convert SeoJson to flat fields
 */
export function seoJsonToFlat(seo_json: string | null): FlatAuthorSeo {
  if (!seo_json) return {};

  try {
    const seo: SeoJson & Record<string, unknown> = JSON.parse(seo_json);
    return {
      metaTitle: (seo.meta_title ?? seo.metaTitle) as string | undefined,
      metaDescription: (seo.meta_description ?? seo.metaDescription) as string | undefined,
      canonicalUrl: seo.canonical,
    };
  } catch {
    return {};
  }
}

/**
 * Validate and sanitize ImagesJson
 */
export function validateImagesJson(images_json: string | null): ImagesJson | null {
  if (!images_json) return null;

  try {
    const images = JSON.parse(images_json);
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
export function validateBioJson(bio_json: string | null): BioJson | null {
  if (!bio_json) return null;

  try {
    const bio = JSON.parse(bio_json);
    if (typeof bio !== 'object') return null;
    return bio as BioJson;
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize PersonaJson
 */
export function validatePersonaJson(persona_json: string | null): PersonaJson | null {
  if (!persona_json) return null;

  try {
    const persona = JSON.parse(persona_json);
    if (typeof persona !== 'object') return null;
    return persona as PersonaJson;
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize SeoJson
 */
export function validateSeoJson(seo_json: string | null): SeoJson | null {
  if (!seo_json) return null;

  try {
    const seo = JSON.parse(seo_json);
    if (typeof seo !== 'object') return null;
    return seo as SeoJson;
  } catch {
    return null;
  }
}
