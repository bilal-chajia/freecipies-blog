import { safeParseJson } from '@shared/utils';
import { buildImageUrl } from '@shared/types/images';

type JsonRecord = Record<string, unknown>;

export type CachedRecipeFields = {
  prep_time_minutes?: number | null;
  prepTimeMinutes?: number | null;
  cook_time_minutes?: number | null;
  cookTimeMinutes?: number | null;
  total_time_minutes?: number | null;
  totalTimeMinutes?: number | null;
  servings?: number | string | null;
};

export type CachedRatingFields = {
  rating_value?: number | null;
  ratingValue?: number | null;
  rating_count?: number | null;
  ratingCount?: number | null;
};

export type ArticleReadingTimeSource = {
  id?: number | string | null;
  slug?: string | null;
  type?: string | null;
  reading_time_minutes?: number | null;
};

type ImageVariantRecord = {
  r2_key?: string;
  r2Key?: string;
  url?: string;
  [key: string]: unknown;
};

type ImageSlotRecord = {
  variants?: Record<string, ImageVariantRecord | undefined>;
  [key: string]: unknown;
};

export type CachedCardFields = {
  image?: ImageSlotRecord;
  author?: {
    avatar?: ImageSlotRecord;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Parses in-memory jsonld_json schema block, ensuring a safe array of objects is returned.
 * Safe fallback for empty object '{}' -> '[]'.
 */
export function parseJsonLdArray(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }
  return [];
}

/**
 * Safely parses cached_card_json column.
 */
export function parseCachedCard(value: unknown): CachedCardFields | null {
  return safeParseJson<CachedCardFields>(value);
}

/**
 * Safely parses cached_recipe_json column.
 */
export function parseCachedRecipe(value: unknown): CachedRecipeFields | null {
  return safeParseJson<CachedRecipeFields>(value);
}

/**
 * Safely parses cached_rating_json column.
 */
export function parseCachedRating(value: unknown): CachedRatingFields | null {
  return safeParseJson<CachedRatingFields>(value);
}

/**
 * Safely parses cached_toc_json column, ensuring an array is returned.
 */
export function parseCachedToc(value: unknown): JsonRecord[] {
  const parsed = safeParseJson<JsonRecord[]>(value);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Safely fetches reading_time_minutes. Prints a short warning and returns a 
 * non-persistent fallback (3 for article/roundup, 5 for recipe) if missing/invalid.
 */
export function getReadingTimeDisplay(article: ArticleReadingTimeSource | null | undefined): number {
  if (!article) return 3;
  const readingTime = article.reading_time_minutes ?? article.reading_time_minutes;
  if (typeof readingTime === 'number' && Number.isFinite(readingTime) && readingTime > 0) {
    return readingTime;
  }

  console.warn(
    `[drift check] Cache drift: reading_time_minutes is missing or invalid on article:`,
    article.slug || article.id || 'unknown'
  );

  return article.type === 'recipe' ? 5 : 3;
}

/**
 * Helper to clean image slots by replacing r2_key or r2Key with public proxy URLs,
 * and deleting raw keys to avoid API leakage.
 */
function cleanImageSlot(slot: ImageSlotRecord | undefined): ImageSlotRecord | undefined {
  if (!slot || typeof slot !== 'object') return slot;
  const cleanedSlot = { ...slot };
  if (cleanedSlot.variants && typeof cleanedSlot.variants === 'object') {
    cleanedSlot.variants = { ...cleanedSlot.variants };
    for (const key of Object.keys(cleanedSlot.variants)) {
      if (cleanedSlot.variants[key] && typeof cleanedSlot.variants[key] === 'object') {
        const variant = { ...cleanedSlot.variants[key] };
        const r2Key = variant.r2_key ?? variant.r2Key;
        if (r2Key) {
          variant.url = buildImageUrl(r2Key);
        }
        delete variant.r2_key;
        delete variant.r2Key;
        cleanedSlot.variants[key] = variant;
      }
    }
  }
  return cleanedSlot;
}

/**
 * Sanitizes card image and author avatar variants so that no r2_key/r2Key leaks publicly.
 */
export function cleanCardImages<T extends CachedCardFields | null>(card: T): T {
  if (!card || typeof card !== 'object') return card;
  const cleaned = { ...card };

  if (cleaned.image) {
    cleaned.image = cleanImageSlot(cleaned.image);
  }

  if (cleaned.author && typeof cleaned.author === 'object') {
    cleaned.author = { ...cleaned.author };
    if (cleaned.author.avatar) {
      cleaned.author.avatar = cleanImageSlot(cleaned.author.avatar);
    }
  }

  return cleaned as T;
}
