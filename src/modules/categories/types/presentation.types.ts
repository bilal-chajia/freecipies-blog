/**
 * Per-category editorial presentation (stored in categories.presentation_json).
 * Page layout/paging/sorting settings are GLOBAL (site_settings.category_page_settings).
 */

export interface FeaturedArticleSnapshot {
  id: number;
  slug: string;
  /** Editorial display title = the source article's headline. */
  title: string;
  /** Resolved public image; never stores r2_key. */
  image?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
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
