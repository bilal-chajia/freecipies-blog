type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pick<T = unknown>(source: JsonRecord, snakeKey: string, camelKey: string): T | undefined {
  return (source[snakeKey] ?? source[camelKey]) as T | undefined;
}

function normalizeRating(value: unknown) {
  if (!isRecord(value)) return null;
  const ratingValue = numberOrNull(pick(value, 'rating_value', 'ratingValue'));
  const ratingCount = numberOrNull(pick(value, 'rating_count', 'ratingCount')) ?? 0;
  if (ratingValue === null && ratingCount === 0) return null;
  return {
    rating_value: ratingValue,
    rating_count: ratingCount,
  };
}

function normalizeServingSize(value: unknown, fallbackLabel: unknown) {
  if (isRecord(value)) {
    return {
      label: stringOrNull(value.label) ?? stringOrNull(fallbackLabel) ?? '1 serving',
      grams: numberOrNull(value.grams) ?? 0,
    };
  }
  return {
    label: stringOrNull(fallbackLabel) ?? '1 serving',
    grams: 0,
  };
}

function normalizeNutrition(value: unknown, servings: number | null) {
  if (!isRecord(value)) return null;
  const calories = numberOrNull(value.calories);
  const totalFat = numberOrNull(value.total_fat_g) ?? numberOrNull(value.fatContent);
  const carbs = numberOrNull(value.total_carbohydrate_g) ?? numberOrNull(value.carbohydrateContent);
  const protein = numberOrNull(value.protein_g) ?? numberOrNull(value.proteinContent);
  const sodium = numberOrNull(value.sodium_mg) ?? numberOrNull(value.sodiumContent);

  if (calories === null && totalFat === null && carbs === null && protein === null && sodium === null) {
    return null;
  }

  return {
    basis: 'per_serving',
    serving_size: normalizeServingSize(value.serving_size, value.servingSize),
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
    status: value.status === 'validated' ? 'validated' : 'validated',
  };
}

function normalizeIngredientGroups(value: unknown) {
  return arrayOrEmpty(value).map((group) => {
    if (!isRecord(group)) return { group_title: 'Ingredients', items: [] };
    return {
      group_title: stringOrNull(group.group_title) ?? stringOrNull(group.group) ?? 'Ingredients',
      items: arrayOrEmpty(group.items).map((item) => {
        if (typeof item === 'string') return { name: item, amount: null, unit: null };
        if (!isRecord(item)) return { name: '', amount: null, unit: null };
        return {
          ...item,
          name: stringOrNull(item.name) ?? '',
          amount: item.amount ?? null,
          unit: item.unit ?? null,
        };
      }),
    };
  });
}

function normalizeInstructions(value: unknown) {
  return arrayOrEmpty(value).map((section) => {
    if (!isRecord(section)) return { section_title: null, steps: [] };
    return {
      section_title: stringOrNull(section.section_title) ?? stringOrNull(section.group),
      steps: arrayOrEmpty(section.steps).map((step, index) => {
        if (typeof step === 'string') return { id: `step-${index + 1}`, text: step };
        if (!isRecord(step)) return { id: `step-${index + 1}`, text: '' };
        const normalized: JsonRecord = {
          ...step,
          id: stringOrNull(step.id) ?? `step-${index + 1}`,
          text: stringOrNull(step.text) ?? '',
        };
        const imageRef = stringOrNull(pick(step, 'image_ref', 'imageRef'));
        if (imageRef) {
          normalized.image_ref = imageRef;
        } else {
          delete normalized.image_ref;
        }
        delete normalized.image;
        delete normalized.imageUrl;
        delete normalized.image_url;
        delete normalized.imageRef;
        return normalized;
      }),
    };
  });
}

function normalizeEquipment(value: unknown) {
  return arrayOrEmpty(value).map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `eq-${index + 1}`,
        equipment_id: null,
        label: item,
        required: true,
        notes: null,
        source_type: 'manual',
        snapshot: null,
      };
    }
    if (!isRecord(item)) {
      return {
        id: `eq-${index + 1}`,
        equipment_id: null,
        label: '',
        required: true,
        notes: null,
        source_type: 'manual',
        snapshot: null,
      };
    }
    const equipmentId = numberOrNull(pick(item, 'equipment_id', 'equipmentId'));
    const sourceType = equipmentId !== null ? 'catalog' : 'manual';
    return {
      id: stringOrNull(item.id) ?? `eq-${index + 1}`,
      equipment_id: sourceType === 'catalog' ? equipmentId : null,
      label: stringOrNull(item.label) ?? stringOrNull(item.name) ?? '',
      required: typeof item.required === 'boolean' ? item.required : true,
      notes: stringOrNull(item.notes),
      source_type: sourceType,
      snapshot: sourceType === 'catalog' && isRecord(item.snapshot) ? item.snapshot : null,
    };
  });
}

function normalizeVideo(value: unknown) {
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

export function normalizeRecipeJson(value: unknown) {
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
    keywords: arrayOrEmpty(source.keywords).filter((item): item is string => typeof item === 'string'),
    suitable_for_diet: arrayOrEmpty(pick(source, 'suitable_for_diet', 'suitableForDiet')).filter((item): item is string => typeof item === 'string'),
    difficulty: stringOrNull(source.difficulty),
    cooking_method: stringOrNull(pick(source, 'cooking_method', 'cookingMethod')),
    estimated_cost: stringOrNull(pick(source, 'estimated_cost', 'estimatedCost')),
    ingredients: normalizeIngredientGroups(source.ingredients),
    instructions: normalizeInstructions(source.instructions),
    tips: arrayOrEmpty(source.tips).filter((item): item is string => typeof item === 'string'),
    nutrition: normalizeNutrition(source.nutrition, servings),
    aggregate_rating: normalizeRating(pick(source, 'aggregate_rating', 'aggregateRating')),
    equipment: normalizeEquipment(source.equipment),
    video: normalizeVideo(source.video),
  };
}

export function buildCachedRatingJson(recipeJson: unknown) {
  const recipe = normalizeRecipeJson(recipeJson);
  return recipe.aggregate_rating ?? {};
}

function mainIngredientNames(ingredients: unknown): string[] {
  return normalizeIngredientGroups(ingredients)
    .flatMap((group) => group.items)
    .map((item) => stringOrNull(item.name))
    .filter((item): item is string => Boolean(item))
    .slice(0, 5);
}

export function buildCachedRecipeJson(recipeJson: unknown, articleType: string) {
  const recipe = normalizeRecipeJson(recipeJson);
  const total = recipe.total ?? (((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null);
  const nutrition = recipe.nutrition;

  return {
    is_recipe: articleType === 'recipe',
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
    calories_per_serving: nutrition?.calories ?? null,
    protein_g: nutrition?.protein_g ?? null,
    carbohydrate_g: nutrition?.total_carbohydrate_g ?? null,
    fat_g: nutrition?.total_fat_g ?? null,
    diet_labels: recipe.suitable_for_diet,
    keyword_labels: recipe.keywords,
    main_ingredients: mainIngredientNames(recipe.ingredients),
    badges: {
      is_quick: (total ?? 999) <= 30,
      is_budget: recipe.estimated_cost === 'Budget',
      is_healthy: recipe.suitable_for_diet.length > 0,
      is_high_protein: (nutrition?.protein_g ?? 0) >= 20,
      is_low_calorie: (nutrition?.calories ?? 9999) <= 400,
      is_vegetarian: recipe.suitable_for_diet.includes('VegetarianDiet'),
      is_vegan: recipe.suitable_for_diet.includes('VeganDiet'),
      is_gluten_free: recipe.suitable_for_diet.includes('GlutenFreeDiet'),
      is_dairy_free: recipe.suitable_for_diet.includes('DairyFreeDiet') || recipe.suitable_for_diet.includes('LowLactoseDiet'),
    },
  };
}

export function normalizeRoundupJson(value: unknown) {
  const source = isRecord(value) ? value : {};
  return {
    items: arrayOrEmpty(source.items).map((item, index) => {
      if (!isRecord(item)) return { position: index + 1, source_type: 'internal_recipe', title: '' };
      const sourceType = item.source_type === 'external_recipe' || item.external_url
        ? 'external_recipe'
        : 'internal_recipe';
      const normalized: JsonRecord = {
        ...item,
        position: numberOrNull(item.position) ?? index + 1,
        source_type: sourceType,
        title: stringOrNull(item.title) ?? '',
      };
      if (sourceType === 'internal_recipe') {
        const articleId = numberOrNull(pick(item, 'article_id', 'articleId'));
        if (articleId !== null) normalized.article_id = articleId;
        const slug = stringOrNull(item.slug);
        if (slug) normalized.slug = slug;
      }
      const externalUrl = stringOrNull(pick(item, 'external_url', 'externalUrl'));
      if (externalUrl) normalized.external_url = externalUrl;
      delete normalized.cover;
      delete normalized.articleId;
      delete normalized.externalUrl;
      delete normalized.canonicalUrl;
      delete normalized.sourceType;
      delete normalized.listType;
      return normalized;
    }),
    list_type: 'ItemList',
  };
}
