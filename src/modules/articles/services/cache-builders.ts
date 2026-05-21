import { safeParseJson } from '../../../shared/utils/hydration';
import { buildCachedRatingJson, buildCachedRecipeJson, normalizeRecipeJson } from '../utils/article-json-contract';

// --- Input Interfaces ---
export interface AuthorCacheInput {
  authorId: number | null;
  authorName: string | null;
  authorSlug: string | null;
  authorAvatar: string | null; // serialized avatar images_json
  authorRole: string | null;
  authorBio: string | null;
  authorBioJson: string | null;
}

export interface CategoryCacheInput {
  categoryId: number | null;
  categoryIdValue: number | null;
  categoryLabel: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
}

export interface CardCacheInput {
  id: number;
  type: string;
  slug: string;
  headline: string;
  shortDescription: string | null;
  imagesJson: string | null;
  readingTimeMinutes: number | null;
  roundupJson: string | null;
}

// --- Output Payload Interfaces ---
export interface AuthorCachePayload {
  id: number;
  name: string | null;
  slug: string | null;
  job_title: string | null;
  bio: string | null;
  avatar: any;
  social_links: any[];
}

export interface CategoryCachePayload {
  id: number;
  label: string | null;
  slug: string | null;
  color: string | null;
}

export interface TagCachePayload {
  id: number;
  label: string;
  slug: string;
  color: string | null;
}

export interface CardCachePayload {
  id: number;
  type: string;
  slug: string;
  headline: string;
  short_description: string | null;
  image: any;
  category: CategoryCachePayload | null;
  author: {
    id: number;
    slug: string | null;
    name: string | null;
    job_title: string | null;
    avatar: any;
  } | null;
  tags: TagCachePayload[];
  recipe?: {
    total_time_minutes: number | null;
    difficulty: string | null;
    calories_per_serving: number | null;
    badges: any;
  };
  rating?: any;
  reading_time?: number | null;
  item_count?: number;
}

// --- Private Helpers Migrated ---
export function buildAuthorSocialLinks(bioJson: unknown) {
  const bio = safeParseJson<any>(bioJson) || {};
  const socials = Array.isArray(bio.socials) ? bio.socials : [];
  return socials
    .filter((item: any) => item && typeof item === 'object' && item.network && item.url)
    .map((item: any) => ({
      network: item.network,
      url: item.url,
      ...(item.label ? { label: item.label } : {}),
    }));
}

export function normalizeCardVariant(variant: any) {
  if (!variant || typeof variant !== 'object' || !variant.r2_key) return undefined;
  return {
    r2_key: variant.r2_key,
    width: Number(variant.width) || 0,
    height: Number(variant.height) || 0,
    ...(Number.isFinite(Number(variant.size_bytes)) ? { size_bytes: Number(variant.size_bytes) } : {}),
  };
}

export function buildCardImage(imagesJson: unknown, fallbackAlt: string) {
  const images = safeParseJson<any>(imagesJson) || {};
  const slot = images.thumbnail || images.hero;
  if (!slot?.variants) return null;
  const xs = normalizeCardVariant(slot.variants.xs);
  const sm = normalizeCardVariant(slot.variants.sm);
  if (!xs || !sm) return null;
  return {
    ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
    alt: slot.alt || fallbackAlt,
    placeholder: slot.placeholder || '',
    variants: { xs, sm },
  };
}

// --- Public Domain Builders ---
export function buildAuthorCache(input: AuthorCacheInput): AuthorCachePayload | null {
  if (!input.authorId) return null;
  const authorImages = safeParseJson<any>(input.authorAvatar) || {};
  return {
    id: input.authorId,
    name: input.authorName,
    slug: input.authorSlug,
    job_title: input.authorRole || null,
    bio: input.authorBio || null,
    avatar: authorImages.avatar || null,
    social_links: buildAuthorSocialLinks(input.authorBioJson),
  };
}

export function buildCategoryCache(input: CategoryCacheInput): CategoryCachePayload | null {
  const id = input.categoryIdValue ?? input.categoryId;
  if (!id) return null;
  return {
    id,
    label: input.categoryLabel,
    slug: input.categorySlug,
    color: input.categoryColor,
  };
}

export function buildTagsCache(
  tags: Array<{ id: number; label: string; slug: string; color?: string | null }>
): TagCachePayload[] {
  return tags.map((tag) => ({
    id: tag.id,
    label: tag.label,
    slug: tag.slug,
    color: tag.color ?? null,
  }));
}

export function buildRecipeCache(
  type: string,
  recipeJson: string | null
) {
  if (type !== 'recipe' || !recipeJson) return null;
  const parsed = safeParseJson<any>(recipeJson);
  const recipe = normalizeRecipeJson(parsed);
  if (!recipe) return null;

  const totalTimeMinutes = recipe.total
    ?? (((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null);

  return {
    recipeJson: JSON.stringify(recipe),
    cachedRecipeJson: buildCachedRecipeJson(recipe, type),
    cachedRatingJson: buildCachedRatingJson(recipe),
    totalTimeMinutes,
    recipeRaw: recipe,
  };
}

export function buildCardCache(
  input: CardCacheInput,
  deps: {
    author: AuthorCachePayload | null;
    category: CategoryCachePayload | null;
    tags: TagCachePayload[];
    recipe: any | null;       // cachedRecipeJson payload
    rating: any | null;       // cachedRatingJson payload
    totalTimeMinutes: number | null;
    recipeRaw?: any;          // raw normalized recipe
  }
): CardCachePayload {
  const card: CardCachePayload = {
    id: input.id,
    type: input.type,
    slug: input.slug,
    headline: input.headline,
    short_description: input.shortDescription,
    image: buildCardImage(input.imagesJson, input.headline),
    category: deps.category,
    author: deps.author ? {
      id: deps.author.id,
      slug: deps.author.slug,
      name: deps.author.name,
      job_title: deps.author.job_title,
      avatar: deps.author.avatar,
    } : null,
    tags: deps.tags,
  };

  if (input.type === 'recipe') {
    card.recipe = {
      total_time_minutes: deps.recipe?.total_time_minutes ?? deps.totalTimeMinutes,
      difficulty: deps.recipe?.difficulty ?? deps.recipeRaw?.difficulty ?? null,
      calories_per_serving: deps.recipe?.calories_per_serving ?? null,
      badges: deps.recipe?.badges ?? {},
    };
    card.rating = deps.rating && Object.keys(deps.rating).length ? deps.rating : null;
  } else if (input.type === 'article') {
    card.reading_time = input.readingTimeMinutes || null;
  } else if (input.type === 'roundup') {
    const roundupData = safeParseJson<any>(input.roundupJson);
    card.item_count = roundupData?.items?.length ?? 0;
  }

  return card;
}
