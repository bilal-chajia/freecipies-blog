import type { RecipeJson, RecipeVideo } from "@modules/articles/types/recipes.types";

type JsonRecord = Record<string, unknown>;

export type RecipeRenderRecord = RecipeJson & {
  recipe_yield: string | null;
  recipe_category: string | null;
  recipe_cuisine: string | null;
  suitable_for_diet: string[];
  cooking_method: unknown;
  estimated_cost: unknown;
  aggregate_rating: {
    rating_value: number | null;
    rating_count: number;
  } | null;
  nutrition: (RecipeJson["nutrition"] & JsonRecord) | null;
  video: (RecipeVideo & {
    content_url?: string | null;
    embed_url?: string | null;
    upload_date?: string | null;
  }) | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRecipe(input: unknown): JsonRecord | null {
  if (!input) return null;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(input) ? input : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function arrayOrEmpty<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function stringArrayOrEmpty(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function normalizeRecipeForRender(input: unknown): RecipeRenderRecord | null {
  const recipe = parseRecipe(input);
  if (!recipe) return null;

  const aggregateRating = recipe.aggregate_rating ?? null;
  const nutrition = isRecord(recipe.nutrition) ? recipe.nutrition : null;
  const video = isRecord(recipe.video) ? recipe.video : null;
  const servingSize = isRecord(nutrition?.serving_size)
    ? nutrition.serving_size
    : {
        label: '1 serving',
        grams: 0,
      };

  return {
    ...recipe,
    recipe_yield: recipe.recipe_yield ?? null,
    recipe_category: recipe.recipe_category ?? null,
    recipe_cuisine: recipe.recipe_cuisine ?? null,
    suitable_for_diet: stringArrayOrEmpty(recipe.suitable_for_diet),
    cooking_method: recipe.cooking_method ?? null,
    estimated_cost: recipe.estimated_cost ?? null,
    aggregate_rating: isRecord(aggregateRating)
      ? {
          rating_value: numberOrNull(aggregateRating.rating_value),
          rating_count: numberOrNull(aggregateRating.rating_count) ?? 0,
        }
      : null,
    nutrition: nutrition
      ? {
          ...nutrition,
          serving_size: servingSize,
          total_fat_g: nutrition.total_fat_g ?? null,
          saturated_fat_g: nutrition.saturated_fat_g ?? null,
          trans_fat_g: nutrition.trans_fat_g ?? null,
          cholesterol_mg: nutrition.cholesterol_mg ?? null,
          sodium_mg: nutrition.sodium_mg ?? null,
          total_carbohydrate_g: nutrition.total_carbohydrate_g ?? null,
          dietary_fiber_g: nutrition.dietary_fiber_g ?? null,
          total_sugars_g: nutrition.total_sugars_g ?? null,
          protein_g: nutrition.protein_g ?? null,
          vitamin_d_mcg: nutrition.vitamin_d_mcg ?? null,
          calcium_mg: nutrition.calcium_mg ?? null,
          iron_mg: nutrition.iron_mg ?? null,
          potassium_mg: nutrition.potassium_mg ?? null,
        }
      : null,
    video: video
      ? {
          ...video,
          content_url: video.content_url ?? null,
          embed_url: video.embed_url ?? null,
          upload_date: video.upload_date ?? null,
        }
      : null,
  } as RecipeRenderRecord;
}
