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

  const aggregateRating = recipe.aggregate_rating ?? recipe.aggregateRating ?? null;
  const nutrition = isRecord(recipe.nutrition) ? recipe.nutrition : null;
  const video = isRecord(recipe.video) ? recipe.video : null;
  const servingSize = isRecord(nutrition?.serving_size)
    ? nutrition.serving_size
    : {
        label: nutrition?.servingSize ?? '1 serving',
        grams: numberOrNull(nutrition?.servingSizeGrams) ?? 0,
      };

  return {
    ...recipe,
    recipe_yield: recipe.recipe_yield ?? recipe.recipeYield ?? null,
    recipe_category: recipe.recipe_category ?? recipe.recipeCategory ?? null,
    recipe_cuisine: recipe.recipe_cuisine ?? recipe.recipeCuisine ?? null,
    suitable_for_diet: stringArrayOrEmpty(recipe.suitable_for_diet ?? recipe.suitableForDiet),
    cooking_method: recipe.cooking_method ?? recipe.cookingMethod ?? null,
    estimated_cost: recipe.estimated_cost ?? recipe.estimatedCost ?? null,
    aggregate_rating: isRecord(aggregateRating)
      ? {
          rating_value: numberOrNull(aggregateRating.rating_value ?? aggregateRating.ratingValue),
          rating_count: numberOrNull(aggregateRating.rating_count ?? aggregateRating.ratingCount) ?? 0,
        }
      : null,
    nutrition: nutrition
      ? {
          ...nutrition,
          serving_size: servingSize,
          total_fat_g: nutrition.total_fat_g ?? nutrition.totalFat ?? nutrition.fatContent ?? null,
          saturated_fat_g: nutrition.saturated_fat_g ?? nutrition.saturatedFat ?? nutrition.saturatedFatContent ?? null,
          trans_fat_g: nutrition.trans_fat_g ?? nutrition.transFat ?? nutrition.transFatContent ?? null,
          cholesterol_mg: nutrition.cholesterol_mg ?? nutrition.cholesterol ?? nutrition.cholesterolContent ?? null,
          sodium_mg: nutrition.sodium_mg ?? nutrition.sodium ?? nutrition.sodiumContent ?? null,
          total_carbohydrate_g: nutrition.total_carbohydrate_g ?? nutrition.totalCarbohydrates ?? nutrition.carbohydrateContent ?? null,
          dietary_fiber_g: nutrition.dietary_fiber_g ?? nutrition.dietaryFiber ?? nutrition.fiberContent ?? null,
          total_sugars_g: nutrition.total_sugars_g ?? nutrition.totalSugars ?? nutrition.sugarContent ?? null,
          protein_g: nutrition.protein_g ?? nutrition.protein ?? nutrition.proteinContent ?? null,
          vitamin_d_mcg: nutrition.vitamin_d_mcg ?? nutrition.vitaminD ?? null,
          calcium_mg: nutrition.calcium_mg ?? nutrition.calcium ?? null,
          iron_mg: nutrition.iron_mg ?? nutrition.iron ?? null,
          potassium_mg: nutrition.potassium_mg ?? nutrition.potassium ?? null,
        }
      : null,
    video: video
      ? {
          ...video,
          content_url: video.content_url ?? video.contentUrl ?? null,
          embed_url: video.embed_url ?? video.embedUrl ?? video.url ?? null,
          upload_date: video.upload_date ?? video.uploadDate ?? null,
        }
      : null,
  } as RecipeRenderRecord;
}
