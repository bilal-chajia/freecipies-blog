/**
 * Structural save-time validation for `articles.recipe_json`.
 *
 * STRUCTURAL, not completeness: it rejects corrupted/malformed payloads while
 * accepting incomplete drafts. Deliberately LENIENT on scalar typing — recipe
 * data passes through the heavy `migrateRecipeJson` coercion layer (legacy ISO
 * times, flat-string ingredients, camelCase nutrition), and the editor may post
 * scalars as numbers or strings — so this gate only enforces the high-confidence
 * structural invariants and lets migration do the canonical shaping:
 *   - the root is an object
 *   - ingredients / instructions / equipment / tips / keywords / diets are arrays
 *   - nutrition / aggregate_rating / video are an object or null (never an array)
 *   - scalars are number | string | null (never an object/array)
 *
 * Completeness (a publishable recipe actually has ingredients, steps, validated
 * nutrition) is a separate concern enforced at the publish transition.
 *
 * @see docs/RECIPE_JSON_CONTRACT.md
 */
import { z } from 'zod';

const scalar = z.union([z.number(), z.string(), z.null()]).optional();
const stringOrNull = z.union([z.string(), z.null()]).optional();
const looseArray = z.array(z.unknown()).optional();
const objectOrNull = z.object({}).passthrough().nullable().optional();

const recipeObjectSchema = z
  .object({
    prep: scalar,
    cook: scalar,
    total: scalar,
    servings: scalar,
    recipe_yield: stringOrNull,
    recipe_category: stringOrNull,
    recipe_cuisine: stringOrNull,
    cooking_method: stringOrNull,
    difficulty: stringOrNull,
    estimated_cost: stringOrNull,
    keywords: looseArray,
    suitable_for_diet: looseArray,
    tips: looseArray,
    ingredients: looseArray,
    instructions: looseArray,
    equipment: looseArray,
    nutrition: objectOrNull,
    aggregate_rating: objectOrNull,
    video: objectOrNull,
  })
  .passthrough();

/**
 * Accepts a recipe payload as an object or JSON string, validates its structure,
 * and returns the parsed object (or `undefined` for an empty/blank payload).
 * Mirrors the `content_json` / `roundup_json` input-schema pattern.
 */
export const RecipeJsonInputSchema = z.unknown().transform((input, ctx) => {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    if (input.trim() === '') return undefined;
    try {
      parsed = JSON.parse(input);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'recipe_json must be valid JSON' });
      return z.NEVER;
    }
  }

  if (parsed === null || parsed === undefined) return undefined;

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    ctx.addIssue({ code: 'custom', message: 'recipe_json must be a recipe object' });
    return z.NEVER;
  }

  const result = recipeObjectSchema.safeParse(parsed);
  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      message: result.error.issues[0]?.message || 'Invalid recipe_json',
    });
    return z.NEVER;
  }

  return result.data;
});
