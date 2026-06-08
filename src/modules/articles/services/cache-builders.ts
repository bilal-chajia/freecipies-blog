import { safeParseJson } from '../../../shared/utils/hydration';
import { buildCachedRatingJson, buildCachedRecipeJson, normalizeRecipeJson } from '../utils/article-json-contract';
import { buildCardImage } from '../../../shared/images/image-contract';

// --- Input Interfaces ---
export interface AuthorCacheInput {
  author_id: number | null;
  authorName: string | null;
  authorSlug: string | null;
  authorAvatar: string | null; // serialized avatar images_json
  authorRole: string | null;
  authorBio: string | null;
  authorBioJson: string | null;
}

export interface CategoryCacheInput {
  category_id: number | null;
  category_id_value: number | null;
  categoryLabel: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
}

export interface CardCacheInput {
  id: number;
  type: string;
  slug: string;
  headline: string;
  short_description: string | null;
  images_json: string | null;
  reading_time_minutes: number | null;
  roundup_json: string | null;
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
export function buildAuthorSocialLinks(bio_json: unknown) {
  const bio = safeParseJson<any>(bio_json) || {};
  const socials = Array.isArray(bio.socials) ? bio.socials : [];
  return socials
    .filter((item: any) => item && typeof item === 'object' && item.network && item.url)
    .map((item: any) => ({
      network: item.network,
      url: item.url,
      ...(item.label ? { label: item.label } : {}),
    }));
}



// --- Public Domain Builders ---
export function buildAuthorCache(input: AuthorCacheInput): AuthorCachePayload | null {
  if (!input.author_id) return null;
  const authorImages = safeParseJson<any>(input.authorAvatar) || {};
  return {
    id: input.author_id,
    name: input.authorName,
    slug: input.authorSlug,
    job_title: input.authorRole || null,
    bio: input.authorBio || null,
    avatar: authorImages.avatar || null,
    social_links: buildAuthorSocialLinks(input.authorBioJson),
  };
}

export function buildCategoryCache(input: CategoryCacheInput): CategoryCachePayload | null {
  const id = input.category_id_value ?? input.category_id;
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
  recipe_json: string | null
) {
  if (type !== 'recipe' || !recipe_json) return null;
  const parsed = safeParseJson<any>(recipe_json);
  const recipe = normalizeRecipeJson(parsed);
  if (!recipe) return null;

  const totalTimeMinutes = recipe.total
    ?? (((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null);

  return {
    recipe_json: JSON.stringify(recipe),
    cached_recipe_json: buildCachedRecipeJson(recipe, type),
    cached_rating_json: buildCachedRatingJson(recipe),
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
    recipe: any | null;       // cached_recipe_json payload
    rating: any | null;       // cached_rating_json payload
    totalTimeMinutes: number | null;
    recipeRaw?: any;          // raw normalized recipe
  }
): CardCachePayload {
  const card: CardCachePayload = {
    id: input.id,
    type: input.type,
    slug: input.slug,
    headline: input.headline,
    short_description: input.short_description,
    image: buildCardImage(input.images_json, input.headline),
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
    card.reading_time = input.reading_time_minutes || null;
  } else if (input.type === 'roundup') {
    const roundupData = safeParseJson<any>(input.roundup_json);
    card.item_count = roundupData?.items?.length ?? 0;
  }

  return card;
}
