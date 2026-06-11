import { describe, expect, it } from 'vitest';
import {
  buildCachedRatingJson,
  buildCachedRecipeJson,
  normalizeRecipeJson,
  normalizeRoundupJson,
} from '../article-json-contract';

describe('recipe_json contract normalization', () => {
  it('keeps canonical snake_case recipe fields', () => {
    const recipe = normalizeRecipeJson({
      prep: 10,
      cook: 20,
      servings: 4,
      recipe_yield: '4 servings',
      recipe_category: 'Dinner',
      recipe_cuisine: 'Cajun',
      suitable_for_diet: ['GlutenFreeDiet'],
      cooking_method: 'Skillet',
      estimated_cost: 'Budget',
      aggregate_rating: {
        rating_value: 4.8,
        rating_count: 12,
      },
      ingredients: [
        {
          group_title: 'Sauce',
          items: [
            {
              id: 'ing-1',
              amount: 1,
              unit: 'tbsp',
              name: 'honey',
              is_optional: true,
            },
          ],
        },
      ],
      video: {
        name: 'Recipe video',
        content_url: 'https://example.com/video.mp4',
        upload_date: '2026-06-04',
      },
    });

    expect(recipe).toMatchObject({
      recipe_yield: '4 servings',
      recipe_category: 'Dinner',
      recipe_cuisine: 'Cajun',
      suitable_for_diet: ['GlutenFreeDiet'],
      cooking_method: 'Skillet',
      estimated_cost: 'Budget',
      aggregate_rating: {
        rating_value: 4.8,
        rating_count: 12,
      },
      video: {
        content_url: 'https://example.com/video.mp4',
        embed_url: null,
        upload_date: '2026-06-04',
      },
    });
    expect(recipe.ingredients[0]?.items[0]?.is_optional).toBe(true);
    expect(buildCachedRatingJson(recipe)).toEqual({
      rating_value: 4.8,
      rating_count: 12,
    });
    expect(buildCachedRecipeJson(recipe, 'recipe')).toMatchObject({
      is_recipe: true,
      recipe_yield: '4 servings',
      recipe_category: 'Dinner',
      recipe_cuisine: 'Cajun',
      cooking_method: 'Skillet',
      estimated_cost: 'Budget',
      diet_labels: ['GlutenFreeDiet'],
    });
  });

  it('ignores camelCase aliases in persisted recipe_json', () => {
    const recipe = normalizeRecipeJson({
      recipeYield: 'legacy servings',
      recipeCategory: 'Legacy dinner',
      recipeCuisine: 'Legacy Cajun',
      suitableForDiet: ['VeganDiet'],
      cookingMethod: 'Legacy skillet',
      estimatedCost: 'Premium',
      aggregateRating: {
        ratingValue: 5,
        ratingCount: 9,
      },
      ingredients: [
        {
          group_title: 'Sauce',
          items: [
            {
              amount: 1,
              unit: 'tbsp',
              name: 'honey',
              isOptional: true,
            },
          ],
        },
      ],
      video: {
        contentUrl: 'https://example.com/legacy.mp4',
        uploadDate: '2026-06-04',
      },
    });

    expect(recipe.recipe_yield).toBeNull();
    expect(recipe.recipe_category).toBeNull();
    expect(recipe.recipe_cuisine).toBeNull();
    expect(recipe.suitable_for_diet).toEqual([]);
    expect(recipe.cooking_method).toBeNull();
    expect(recipe.estimated_cost).toBeNull();
    expect(recipe.aggregate_rating).toBeNull();
    expect(recipe.ingredients[0]?.items[0]?.is_optional).toBe(false);
    expect(recipe.video).toBeNull();
  });

  it('keeps internal roundup article_id while rejecting camel externalUrl aliases', () => {
    const roundup = normalizeRoundupJson({
      items: [
        {
          article_id: 42,
          title: 'Internal recipe',
        },
        {
          source_type: 'external_recipe',
          title: 'External recipe',
          externalUrl: 'https://legacy.example/recipe',
        },
      ],
    });

    expect(roundup.items[0]).toMatchObject({
      article_id: 42,
      source_type: 'internal_recipe',
      title: 'Internal recipe',
    });
    expect(roundup.items[1]).not.toHaveProperty('external_url');
  });

  it('preserves roundup presentation settings (group title/description/show_stats)', () => {
    const roundup = normalizeRoundupJson({
      list_type: 'ItemList',
      group_title: 'Summer Salads',
      group_description: 'Warm-weather bowls.',
      show_stats: false,
      items: [{ source_type: 'internal_recipe', article_id: 7, slug: 'a', title: 'A' }],
    }) as Record<string, unknown>;

    expect(roundup.group_title).toBe('Summer Salads');
    expect(roundup.group_description).toBe('Warm-weather bowls.');
    expect(roundup.show_stats).toBe(false);
  });

  it('omits blank presentation fields on normalization', () => {
    const roundup = normalizeRoundupJson({ items: [] }) as Record<string, unknown>;
    expect(roundup.group_title).toBeUndefined();
    expect('show_stats' in roundup).toBe(false);
    expect('visible_badges' in roundup).toBe(false);
  });

  it('preserves a valid visible_badges selection and drops non-string entries', () => {
    const roundup = normalizeRoundupJson({
      items: [],
      visible_badges: ['total_time', 42, 'calories', null],
    }) as Record<string, unknown>;
    expect(roundup.visible_badges).toEqual(['total_time', 'calories']);
  });
});
