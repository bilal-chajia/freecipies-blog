/**
 * Per-category editorial presentation (stored in categories.presentation_json).
 * Page layout/paging/sorting settings are GLOBAL (site_settings.category_page_settings).
 */

import type { StoredImageVariants } from '@shared/types/images';

/**
 * Stored image snapshot for the featured article, mirroring `cached_card_json.image`.
 * Per IMAGE_JSON_CONTRACT, a STORED snapshot keeps `r2_key` variants (never `url`);
 * the API/render boundary resolves them to public URLs.
 */
export interface FeaturedArticleImage {
  media_id?: number;
  alt: string;
  placeholder?: string;
  aspect_ratio?: string;
  focal_point?: { x: number; y: number };
  variants: StoredImageVariants;
}

export interface FeaturedArticleSnapshot {
  id: number;
  slug: string;
  /** Editorial display title = the source article's headline. */
  title: string;
  image?: FeaturedArticleImage;
}

export interface HeroCta {
  show: boolean;
  text: string;
  link: string;
}

export const HERO_CTA_DEFAULT: HeroCta = { show: false, text: '', link: '' };

export interface CategoryPresentation {
  featured_article?: FeaturedArticleSnapshot | null;
  tldr?: string;
  hero_cta?: HeroCta;
}
