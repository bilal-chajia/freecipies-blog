// src/server/site-data/stories/types.ts

/** A fully-resolved public image for a story (never exposes r2_key). */
export interface StoryImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export type StorySlideKind = 'cover' | 'ingredients' | 'step' | 'info' | 'cta';

/** Optional cover metadata pills (recipe stories). */
export interface StorySlideMeta {
  total_time?: string;
  servings?: string;
  rating?: string;
}

export interface StorySlide {
  /** Stable id, e.g. "cover", "step-3", "nutrition", "cta". */
  id: string;
  kind: StorySlideKind;
  /** Full-screen background image. */
  image?: StoryImage;
  heading?: string;
  /** Short body text (already truncated for full-screen legibility). */
  body?: string;
  /** Ingredient lines for the 'ingredients' slide (already capped). */
  items?: string[];
  meta?: StorySlideMeta;
}

export interface StoryPreview {
  slug: string;
  headline: string;
  /** Ring thumbnail. */
  image: StoryImage;
  /** Canonical story page, e.g. "/stories/easy-pasta". */
  href: string;
}

export interface Story {
  slug: string;
  type: 'recipe' | 'article' | 'roundup';
  title: string;
  publisher: string;
  publisher_logo_url: string;
  poster_portrait_url: string;
  poster_square_url?: string;
  poster_landscape_url?: string;
  /** Absolute canonical URL of the story page. */
  canonical_url: string;
  /** Full-article CTA target (e.g. "/recipes/easy-pasta"). */
  target_url: string;
  slides: StorySlide[];
}

/** Settings-derived context passed into the pure story builder. */
export interface StoryContext {
  /** Absolute site origin, no trailing slash, e.g. "https://site.com". */
  origin: string;
  publisher: string;
  publisher_logo_url: string;
}
