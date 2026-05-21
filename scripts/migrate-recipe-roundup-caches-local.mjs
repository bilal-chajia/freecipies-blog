#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import process from 'node:process';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value) {
  if (isRecord(value) || Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function detectD1Path() {
  const root = join(process.cwd(), '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(root)) fail(`Local D1 state directory not found: ${root}`);
  for (const name of readdirSync(root)) {
    if (!name.endsWith('.sqlite') || name === 'metadata.sqlite') continue;
    const candidate = join(root, name);
    const db = new DatabaseSync(candidate);
    try {
      if (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles'").get()) return candidate;
    } finally {
      db.close();
    }
  }
  fail('No local D1 sqlite file with an articles table was found.');
}

function numberOrNull(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function pick(source, snakeKey, camelKey) {
  return source?.[snakeKey] ?? source?.[camelKey];
}

function normalizeRating(value) {
  if (!isRecord(value)) return null;
  const ratingValue = numberOrNull(pick(value, 'rating_value', 'ratingValue'));
  const ratingCount = numberOrNull(pick(value, 'rating_count', 'ratingCount')) ?? 0;
  if (ratingValue === null && ratingCount === 0) return null;
  return { rating_value: ratingValue, rating_count: ratingCount };
}

function normalizeNutrition(value, servings) {
  if (!isRecord(value)) return null;
  const calories = numberOrNull(value.calories);
  const totalFat = numberOrNull(value.total_fat_g) ?? numberOrNull(value.fatContent);
  const carbs = numberOrNull(value.total_carbohydrate_g) ?? numberOrNull(value.carbohydrateContent);
  const protein = numberOrNull(value.protein_g) ?? numberOrNull(value.proteinContent);
  const sodium = numberOrNull(value.sodium_mg) ?? numberOrNull(value.sodiumContent);
  if (calories === null && totalFat === null && carbs === null && protein === null && sodium === null) return null;
  return {
    basis: 'per_serving',
    serving_size: {
      label: stringOrNull(value.serving_size?.label) ?? stringOrNull(value.servingSize) ?? '1 serving',
      grams: numberOrNull(value.serving_size?.grams) ?? 0,
    },
    servings_per_recipe: numberOrNull(value.servings_per_recipe) ?? servings ?? 1,
    calories: calories ?? 0,
    total_fat_g: totalFat ?? 0,
    saturated_fat_g: numberOrNull(value.saturated_fat_g) ?? numberOrNull(value.saturatedFatContent) ?? 0,
    trans_fat_g: numberOrNull(value.trans_fat_g) ?? numberOrNull(value.transFatContent) ?? 0,
    cholesterol_mg: numberOrNull(value.cholesterol_mg) ?? numberOrNull(value.cholesterolContent) ?? 0,
    sodium_mg: sodium ?? 0,
    total_carbohydrate_g: carbs ?? 0,
    dietary_fiber_g: numberOrNull(value.dietary_fiber_g) ?? numberOrNull(value.fiberContent) ?? 0,
    total_sugars_g: numberOrNull(value.total_sugars_g) ?? numberOrNull(value.sugarContent) ?? 0,
    added_sugars_g: numberOrNull(value.added_sugars_g) ?? 0,
    protein_g: protein ?? 0,
    vitamin_d_mcg: numberOrNull(value.vitamin_d_mcg) ?? 0,
    calcium_mg: numberOrNull(value.calcium_mg) ?? 0,
    iron_mg: numberOrNull(value.iron_mg) ?? 0,
    potassium_mg: numberOrNull(value.potassium_mg) ?? 0,
    status: 'validated',
  };
}

function normalizeIngredientGroups(value) {
  return arrayOrEmpty(value).map((group) => {
    if (!isRecord(group)) return { group_title: 'Ingredients', items: [] };
    return {
      group_title: stringOrNull(group.group_title) ?? stringOrNull(group.group) ?? 'Ingredients',
      items: arrayOrEmpty(group.items).map((item) => {
        if (typeof item === 'string') return { name: item, amount: null, unit: null };
        if (!isRecord(item)) return { name: '', amount: null, unit: null };
        return { ...item, name: stringOrNull(item.name) ?? '', amount: item.amount ?? null, unit: item.unit ?? null };
      }),
    };
  });
}

function normalizeInstructions(value) {
  return arrayOrEmpty(value).map((section) => {
    if (!isRecord(section)) return { section_title: null, steps: [] };
    return {
      section_title: stringOrNull(section.section_title) ?? stringOrNull(section.group),
      steps: arrayOrEmpty(section.steps).map((step, index) => {
        if (typeof step === 'string') return { id: `step-${index + 1}`, text: step };
        if (!isRecord(step)) return { id: `step-${index + 1}`, text: '' };
        const normalized = { ...step, id: stringOrNull(step.id) ?? `step-${index + 1}`, text: stringOrNull(step.text) ?? '' };
        delete normalized.image;
        return normalized;
      }),
    };
  });
}

function normalizeEquipment(value) {
  return arrayOrEmpty(value).map((item, index) => {
    if (typeof item === 'string') {
      return { id: `eq-${index + 1}`, equipment_id: null, label: item, required: true, notes: null, source_type: 'manual', snapshot: null };
    }
    if (!isRecord(item)) {
      return { id: `eq-${index + 1}`, equipment_id: null, label: '', required: true, notes: null, source_type: 'manual', snapshot: null };
    }
    const equipmentId = numberOrNull(pick(item, 'equipment_id', 'equipmentId'));
    const sourceType = equipmentId !== null && isRecord(item.snapshot) ? 'catalog' : 'manual';
    return {
      id: stringOrNull(item.id) ?? `eq-${index + 1}`,
      equipment_id: sourceType === 'catalog' ? equipmentId : null,
      label: stringOrNull(item.label) ?? stringOrNull(item.name) ?? '',
      required: typeof item.required === 'boolean' ? item.required : true,
      notes: stringOrNull(item.notes),
      source_type: sourceType,
      snapshot: sourceType === 'catalog' ? item.snapshot : null,
    };
  });
}

function normalizeVideo(value) {
  if (!isRecord(value)) return null;
  const url = stringOrNull(value.url);
  const contentUrl = stringOrNull(pick(value, 'content_url', 'contentUrl'));
  const embedUrl = stringOrNull(pick(value, 'embed_url', 'embedUrl')) ?? url;
  if (!contentUrl && !embedUrl) return null;
  return {
    name: stringOrNull(value.name) ?? 'Recipe video',
    description: stringOrNull(value.description) ?? '',
    thumbnail: isRecord(value.thumbnail) ? value.thumbnail : null,
    content_url: contentUrl,
    embed_url: embedUrl,
    duration: stringOrNull(value.duration),
    upload_date: stringOrNull(pick(value, 'upload_date', 'uploadDate')),
  };
}

function normalizeRecipeJson(value) {
  const source = isRecord(value) ? value : {};
  const servings = numberOrNull(source.servings);
  return {
    prep: numberOrNull(source.prep),
    cook: numberOrNull(source.cook),
    total: numberOrNull(source.total),
    servings,
    recipe_yield: stringOrNull(pick(source, 'recipe_yield', 'recipeYield')),
    recipe_category: stringOrNull(pick(source, 'recipe_category', 'recipeCategory') ?? source.course),
    recipe_cuisine: stringOrNull(pick(source, 'recipe_cuisine', 'recipeCuisine') ?? source.cuisine),
    keywords: arrayOrEmpty(source.keywords).filter((item) => typeof item === 'string'),
    suitable_for_diet: arrayOrEmpty(pick(source, 'suitable_for_diet', 'suitableForDiet')).filter((item) => typeof item === 'string'),
    difficulty: stringOrNull(source.difficulty),
    cooking_method: stringOrNull(pick(source, 'cooking_method', 'cookingMethod')),
    estimated_cost: stringOrNull(pick(source, 'estimated_cost', 'estimatedCost')),
    ingredients: normalizeIngredientGroups(source.ingredients),
    instructions: normalizeInstructions(source.instructions),
    tips: arrayOrEmpty(source.tips).filter((item) => typeof item === 'string'),
    nutrition: normalizeNutrition(source.nutrition, servings),
    aggregate_rating: normalizeRating(pick(source, 'aggregate_rating', 'aggregateRating')),
    equipment: normalizeEquipment(source.equipment),
    video: normalizeVideo(source.video),
  };
}

function mainIngredients(recipe) {
  return normalizeIngredientGroups(recipe.ingredients)
    .flatMap((group) => group.items)
    .map((item) => stringOrNull(item.name))
    .filter(Boolean)
    .slice(0, 5);
}

function buildCachedRecipeJson(recipe, type) {
  const total = recipe.total ?? (((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null);
  return {
    is_recipe: type === 'recipe',
    prep_time_minutes: recipe.prep,
    cook_time_minutes: recipe.cook,
    total_time_minutes: total,
    servings: recipe.servings,
    recipe_yield: recipe.recipe_yield,
    difficulty: recipe.difficulty,
    recipe_category: recipe.recipe_category,
    recipe_cuisine: recipe.recipe_cuisine,
    cooking_method: recipe.cooking_method,
    estimated_cost: recipe.estimated_cost,
    calories_per_serving: recipe.nutrition?.calories ?? null,
    protein_g: recipe.nutrition?.protein_g ?? null,
    carbohydrate_g: recipe.nutrition?.total_carbohydrate_g ?? null,
    fat_g: recipe.nutrition?.total_fat_g ?? null,
    diet_labels: recipe.suitable_for_diet,
    keyword_labels: recipe.keywords,
    main_ingredients: mainIngredients(recipe),
    badges: {
      is_quick: (total ?? 999) <= 30,
      is_budget: recipe.estimated_cost === 'Budget',
      is_healthy: recipe.suitable_for_diet.length > 0,
      is_high_protein: (recipe.nutrition?.protein_g ?? 0) >= 20,
      is_low_calorie: (recipe.nutrition?.calories ?? 9999) <= 400,
      is_vegetarian: recipe.suitable_for_diet.includes('VegetarianDiet'),
      is_vegan: recipe.suitable_for_diet.includes('VeganDiet'),
      is_gluten_free: recipe.suitable_for_diet.includes('GlutenFreeDiet'),
      is_dairy_free: recipe.suitable_for_diet.includes('DairyFreeDiet') || recipe.suitable_for_diet.includes('LowLactoseDiet'),
    },
  };
}

function normalizeRoundupJson(value) {
  const source = isRecord(value) ? value : {};
  return {
    items: arrayOrEmpty(source.items).map((item, index) => {
      if (!isRecord(item)) return { position: index + 1, source_type: 'internal_recipe', title: '' };
      const sourceType = item.source_type === 'external_recipe' || item.external_url ? 'external_recipe' : 'internal_recipe';
      const normalized = { ...item, position: numberOrNull(item.position) ?? index + 1, source_type: sourceType, title: stringOrNull(item.title) ?? '' };
      const articleId = numberOrNull(pick(item, 'article_id', 'articleId'));
      if (sourceType === 'internal_recipe' && articleId !== null) normalized.article_id = articleId;
      const externalUrl = stringOrNull(pick(item, 'external_url', 'externalUrl'));
      if (externalUrl) normalized.external_url = externalUrl;
      delete normalized.articleId;
      delete normalized.externalUrl;
      delete normalized.canonicalUrl;
      delete normalized.sourceType;
      return normalized;
    }),
    list_type: 'ItemList',
  };
}

function main() {
  if (args.includes('--remote')) fail('Remote access is forbidden. This migration only edits local Miniflare D1 state.');
  const d1Path = detectD1Path();
  const db = new DatabaseSync(d1Path);
  try {
    const rows = db.prepare(`
      SELECT id, type, recipe_json, roundup_json, cached_recipe_json, cached_rating_json
      FROM articles
      WHERE deleted_at IS NULL
      ORDER BY id
    `).all();
    const updates = [];
    for (const row of rows) {
      const recipe = normalizeRecipeJson(parseJson(row.recipe_json));
      const roundup = normalizeRoundupJson(parseJson(row.roundup_json));
      const cachedRecipe = row.type === 'recipe' ? buildCachedRecipeJson(recipe, row.type) : null;
      const cachedRating = row.type === 'recipe' ? recipe.aggregate_rating ?? null : null;
      const next = {
        recipe_json: JSON.stringify(row.type === 'recipe' ? recipe : {}),
        roundup_json: JSON.stringify(row.type === 'roundup' ? roundup : { items: [], list_type: 'ItemList' }),
        cached_recipe_json: cachedRecipe ? JSON.stringify(cachedRecipe) : null,
        cached_rating_json: cachedRating ? JSON.stringify(cachedRating) : null,
      };
      if (
        next.recipe_json !== row.recipe_json
        || next.roundup_json !== row.roundup_json
        || next.cached_recipe_json !== row.cached_recipe_json
        || next.cached_rating_json !== row.cached_rating_json
      ) {
        updates.push({ id: row.id, ...next });
      }
    }
    if (apply && updates.length) {
      const update = db.prepare(`
        UPDATE articles
        SET recipe_json = ?, roundup_json = ?, cached_recipe_json = ?, cached_rating_json = ?
        WHERE id = ?
      `);
      db.exec('BEGIN');
      try {
        for (const row of updates) {
          update.run(row.recipe_json, row.roundup_json, row.cached_recipe_json, row.cached_rating_json, row.id);
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      local_only: true,
      d1_path: d1Path,
      rows_scanned: rows.length,
      rows_to_update: updates.length,
      updates: updates.map((row) => ({ id: row.id })),
    }, null, 2));
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
