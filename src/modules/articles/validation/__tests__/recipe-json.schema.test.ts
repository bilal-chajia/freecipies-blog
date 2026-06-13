import { describe, it, expect } from 'vitest';
import { RecipeJsonInputSchema } from '../recipe-json.schema';
import { DEFAULT_RECIPE_JSON } from '../../types/recipes.types';

const parse = (input: unknown) => RecipeJsonInputSchema.safeParse(input);

describe('RecipeJsonInputSchema — accepts valid + draft payloads', () => {
  it('accepts the canonical default recipe shape', () => {
    expect(parse(DEFAULT_RECIPE_JSON).success).toBe(true);
  });

  it('accepts a populated canonical recipe', () => {
    const r = parse({
      prep: 15,
      cook: 30,
      total: 45,
      servings: 4,
      difficulty: 'Easy',
      keywords: ['lemon'],
      suitable_for_diet: ['VeganDiet'],
      ingredients: [{ group_title: 'Main', items: [{ amount: 2, unit: 'cups', name: 'flour' }] }],
      instructions: [{ section_title: 'Steps', steps: [{ text: 'Mix' }] }],
      tips: ['Rest the dough'],
      nutrition: { calories: 200, total_fat_g: 8 },
      aggregate_rating: { rating_value: 4.8, rating_count: 12 },
      equipment: [],
      video: null,
    });
    expect(r.success).toBe(true);
  });

  it('accepts an empty draft', () => {
    expect(parse({}).success).toBe(true);
  });

  it('accepts a partial draft (work in progress)', () => {
    expect(parse({ ingredients: [{ group_title: 'x', items: [] }] }).success).toBe(true);
  });

  it('is lenient on scalar typing (string or number times/servings)', () => {
    expect(parse({ servings: '4', prep: '15' }).success).toBe(true);
  });

  it('accepts a JSON-encoded string payload', () => {
    expect(parse(JSON.stringify(DEFAULT_RECIPE_JSON)).success).toBe(true);
  });

  it('treats an empty string as no recipe (undefined)', () => {
    const r = parse('');
    expect(r.success).toBe(true);
    expect((r as any).data).toBeUndefined();
  });
});

describe('RecipeJsonInputSchema — rejects structural corruption', () => {
  it('rejects invalid JSON string', () => {
    expect(parse('{ not json').success).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(parse('"a string"').success).toBe(false);
    expect(parse([1, 2, 3]).success).toBe(false);
  });

  it('rejects ingredients that are not an array', () => {
    expect(parse({ ingredients: 'flour, sugar' }).success).toBe(false);
  });

  it('rejects instructions that are not an array', () => {
    expect(parse({ instructions: 'mix then bake' }).success).toBe(false);
  });

  it('rejects equipment that is not an array', () => {
    expect(parse({ equipment: 'oven' }).success).toBe(false);
  });

  it('rejects nutrition that is an array', () => {
    expect(parse({ nutrition: [1, 2] }).success).toBe(false);
  });

  it('rejects video that is an array', () => {
    expect(parse({ video: ['x'] }).success).toBe(false);
  });

  it('rejects a scalar that is an object', () => {
    expect(parse({ servings: { value: 4 } }).success).toBe(false);
  });
});
