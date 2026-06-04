/**
 * Recipe Types — Unified Source of Truth
 * =======================================
 * 
 * This file defines the complete RecipeJson format used across the SaaS:
 * 
 *   1. **RecipeBuilder** (admin) — editing UI for recipe structured data
 *   2. **RecipeCard** (frontend) — rendering ingredients, instructions, nutrition, etc.
 *   3. **JSON-LD** (SEO) — Schema.org Recipe rich snippets for Google
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │  FIELD BOUNDARY — article vs recipe_json                     │
 * │                                                             │
 * │  Article-level (NOT in recipe_json):                         │
 * │    headline, short_description, images_json,                  │
 * │    author_id, category_id, published_at, slug, tags            │
 * │                                                             │
 * │  RecipeJson (THIS file):                                    │
 * │    time, servings, classification, ingredients,              │
 * │    instructions, nutrition, equipment, video, tips, rating   │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Stored as TEXT in `articles.recipe_json` column.
 * Parsed to object by `hydrateArticle()` on read.
 * Stringified by `updateArticleById()` on write.
 * 
 * @see articles.schema.ts — DB column definition
 * @see hydration.ts — parsing on read
 * @see articles.service.ts — serialization on write
 */


// ═══════════════════════════════════════════════
// §1. Nutrition (Schema.org NutritionInformation)
// ═══════════════════════════════════════════════

/**
 * Serving size for a Nutrition Facts payload.
 * @see RECIPE_JSON_CONTRACT.md → Nutrition
 */
export interface NutritionServingSize {
    /** Human-readable serving label, e.g. "1 bowl", "1 cookie". */
    label: string;
    /** Serving weight in grams. */
    grams: number;
}

/**
 * Nutrition Facts payload per serving — canonical RECIPE_JSON_CONTRACT shape.
 *
 * Serialized **snake_case** with units encoded in the field names (`_g`, `_mg`,
 * `_mcg`). This is the exact object stored in `recipe_json.nutrition` and read
 * by NutritionFacts.astro, the JSON-LD generator, and the cached-fields builder.
 *
 * Required-when-present: `serving_size.label`, `serving_size.grams`,
 * `servings_per_recipe`, `calories`, `total_fat_g`, `total_carbohydrate_g`,
 * `protein_g`, `sodium_mg`, and `status: "validated"`.
 *
 * @see docs/RECIPE_JSON_CONTRACT.md → Nutrition (lines ~405-492)
 */
export interface NutritionInfo {
    /** Calculation basis — always per serving. */
    basis: 'per_serving';
    /** Serving size label + weight. */
    serving_size: NutritionServingSize;
    /** Servings per recipe — must match `RecipeJson.servings`. */
    servings_per_recipe: number;

    /** Calories per serving in kcal. */
    calories: number;
    /** Total fat (g) — Schema.org `fatContent`. */
    total_fat_g: number;
    /** Saturated fat (g) — Schema.org `saturatedFatContent`. */
    saturated_fat_g?: number;
    /** Trans fat (g) — Schema.org `transFatContent`. */
    trans_fat_g?: number;
    /** Cholesterol (mg) — Schema.org `cholesterolContent`. */
    cholesterol_mg?: number;
    /** Sodium (mg) — Schema.org `sodiumContent`. */
    sodium_mg: number;
    /** Total carbohydrate (g) — Schema.org `carbohydrateContent`. */
    total_carbohydrate_g: number;
    /** Dietary fiber (g) — Schema.org `fiberContent`. */
    dietary_fiber_g?: number;
    /** Total sugars (g) — Schema.org `sugarContent`. */
    total_sugars_g?: number;
    /** Added sugars (g) — Nutrition Facts UI only. */
    added_sugars_g?: number;
    /** Protein (g) — Schema.org `proteinContent`. */
    protein_g: number;

    /** Vitamin D (mcg) — Nutrition Facts UI only. */
    vitamin_d_mcg?: number;
    /** Calcium (mg) — Nutrition Facts UI only. */
    calcium_mg?: number;
    /** Iron (mg) — Nutrition Facts UI only. */
    iron_mg?: number;
    /** Potassium (mg) — Nutrition Facts UI only. */
    potassium_mg?: number;

    /** Validation status — must be `validated` for published recipes. */
    status: 'validated';
}


// ═══════════════════════════════════════════════
// §2. Ingredients
// ═══════════════════════════════════════════════

/**
 * Possible substitute for an ingredient.
 * Used for the substitutions feature in RecipeCard.
 * @example { name: "coconut oil", ratio: "1:1", notes: "slightly different flavor" }
 */
export interface IngredientSubstitute {
    /** Substitute ingredient name */
    name: string;

    /** Ratio relative to original @example "1:1" */
    ratio?: string;

    /** Additional notes @example "denser result" */
    notes?: string;
}


/**
 * Individual ingredient item within a group.
 * 
 * Supports both UI display (IngredientsSection.astro) and JSON-LD formatting.
 * The `amount` field is numeric for ingredient scaling when the user changes
 * the servings count in RecipeCard.
 * 
 * **Frontend rendering (IngredientsSection.astro) already supports:**
 * `amount`, `unit`, `name`, `prep`, `notes`, `isOptional`
 * 
 * @see IngredientsSection.astro — renders all fields
 * @see formatIngredient() — converts to string for JSON-LD
 */
export interface IngredientItem {
    /**
     * Stable ID for shopping list persistence and UI keys.
     * Auto-generated if not provided.
     */
    id?: string;

    /**
     * Amount as FLOAT for scaling calculations.
     * IngredientsSection.astro stores this in `data-original-amount` for scaling.
     * @example 315, 0.5, 2.5
     */
    amount: number;

    /**
     * Unit of measurement.
     * IngredientsSection.astro handles pluralization automatically.
     * @example "grams", "cups", "tbsp", "oz", "pieces"
     */
    unit: string;

    /** Ingredient name @example "all-purpose flour", "unsalted butter" */
    name: string;

    /**
     * Preparation state — shown after the ingredient name in italic.
     * @example "diced", "minced", "melted", "sifted", "at room temperature"
     */
    prep?: string;

    /**
     * Additional notes — rendered below the ingredient line in muted style.
     * @example "or use almond flour for gluten-free", "preferably organic"
     */
    notes?: string;

    /** Whether this ingredient is optional — shown as "(optional)" tag */
    isOptional?: boolean;

    /** Alternative ingredients for the substitutions feature */
    substitutes?: IngredientSubstitute[];
}


/**
 * Group of ingredients (e.g., "For the Dough", "For the Glaze").
 * RecipeCard renders each group with its own heading.
 * 
 * JSON-LD flattens all groups into a single `recipeIngredient` array.
 */
export interface IngredientGroup {
    /**
     * Group heading shown in the recipe card.
     * @example "For the Dough", "Sauce", "Garnish"
     */
    group_title: string;

    /** Ingredients in this group */
    items: IngredientItem[];
}


// ═══════════════════════════════════════════════
// §3. Instructions
// ═══════════════════════════════════════════════

/**
 * Individual recipe step within a section.
 * 
 * **Frontend rendering (InstructionsSection.astro) already supports:**
 * `name` (step title), `text` (body), `tip` (step-level note), `timer` (button)
 * 
 * @see InstructionsSection.astro — renders all fields
 * @see toSchemaOrgInstructions() — converts to HowToStep for JSON-LD
 */
export interface InstructionStep {
    /**
     * Optional step title — rendered as bold heading above the step text.
     * Maps to HowToStep.name in JSON-LD.
     * @example "Mix dry ingredients", "Prepare the filling"
     */
    name?: string;

    /**
     * Step description — the main instruction content.
     * Maps to HowToStep.text in JSON-LD.
     */
    text: string;

    /**
     * Step image reference resolved from `articles.images_json.recipe_steps`.
     * Maps to HowToStep.image in JSON-LD after server-side resolution.
     */
    image_ref?: string | null;

    /**
     * Timer duration in **minutes** for the UI timer feature.
     * InstructionsSection.astro renders a clickable timer button.
     * @example 20 (=20 minutes)
     */
    timer?: number;

    /**
     * Step-level tip shown in a highlighted box below the step.
     * Rendered with 💡 icon in InstructionsSection.astro.
     * @example "Don't overmix or the cookies will be tough"
     */
    tip?: string;
}


/**
 * Section of instructions (e.g., "Make the dough", "Prepare the filling").
 * 
 * Maps to HowToSection in JSON-LD when it has multiple steps.
 * When it has a single step, the section is flattened to a single HowToStep.
 */
export interface InstructionSection {
    /**
     * Section heading — rendered with a colored underline in InstructionsSection.astro.
     * @example "Make the Dough", "Assembly", "Final Touches"
     */
    section_title: string;

    /** Ordered steps in this section */
    steps: InstructionStep[];
}


// ═══════════════════════════════════════════════
// §4. Equipment
// ═══════════════════════════════════════════════

export interface RecipeEquipmentSnapshot {
    slug: string;
    name: string;
    brand?: string | null;
    description?: string | null;
    category?: string | null;
    image?: Record<string, unknown> | null;
    affiliate_url?: string | null;
    affiliate_provider?: string | null;
    affiliate_note?: string | null;
}

/**
 * Equipment item needed for the recipe.
 *
 * `recipe_json.equipment` is the complete checklist. Catalog items copy their
 * render snapshot from the equipment table at article save time; public render
 * reads this snapshot and does not join the equipment table.
 */
export interface EquipmentItem {
    id: string;
    equipment_id: number | null;
    label: string;
    required: boolean;
    notes?: string | null;
    source_type: 'catalog' | 'manual';
    snapshot: RecipeEquipmentSnapshot | null;
}


// ═══════════════════════════════════════════════
// §5. Video
// ═══════════════════════════════════════════════

/**
 * Video content for the recipe.
 * 
 * Significantly enhances Google rich snippet visibility — recipes with video
 * get a video thumbnail in search results.
 * 
 * RecipeCard.astro renders this as an embedded iframe in a "Video Tutorial" section.
 */
export interface RecipeVideo {
    /** Video URL (YouTube, Vimeo, or direct MP4) */
    url: string;

    /** Video title — used for iframe title attribute and JSON-LD */
    name: string;

    /** Video description for JSON-LD */
    description?: string;

    /** Thumbnail image URL — used in JSON-LD VideoObject */
    thumbnail_url?: string;

    /**
     * Duration in ISO-8601 format for JSON-LD.
     * @example "PT2M30S" (2 minutes 30 seconds)
     * @example "PT10M" (10 minutes)
     */
    duration: string;

    /** Upload date in ISO-8601 format @example "2024-01-15" */
    uploadDate?: string;
}


// ═══════════════════════════════════════════════
// §6. Aggregate Rating
// ═══════════════════════════════════════════════

/**
 * Aggregate rating data for the recipe.
 * 
 * Rendered as star rating in RecipeCard.astro header.
 * Maps to Schema.org AggregateRating in JSON-LD.
 * 
 * Only shown when `ratingValue > 0` and `ratingCount > 0`.
 */
export interface AggregateRating {
    /** Average rating value (1-5 scale) @example 4.8 */
    ratingValue: number | null;

    /** Number of ratings/votes @example 55 */
    ratingCount: number;
}


// ═══════════════════════════════════════════════
// §7. Enums & Unions
// ═══════════════════════════════════════════════

/**
 * Schema.org RestrictedDiet values.
 * Used for diet badges in RecipeCard and RecipeMetaPills.
 * @see https://schema.org/RestrictedDiet
 */
export type DietType =
    | 'VeganDiet'
    | 'VegetarianDiet'
    | 'GlutenFreeDiet'
    | 'DiabeticDiet'
    | 'HalalDiet'
    | 'HinduDiet'
    | 'KosherDiet'
    | 'LowCalorieDiet'
    | 'LowFatDiet'
    | 'LowLactoseDiet'
    | 'LowSaltDiet';

/**
 * Recipe difficulty level.
 * RecipeMetaPills.astro renders a visual bar indicator (1/2/3 bars).
 * Stored in `recipe_json.difficulty` and mirrored to `cached_recipe_json.difficulty`.
 */
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

/**
 * Estimated cost level for filtering and display.
 * Mirrored to `cached_recipe_json.estimated_cost`; budget display flags are
 * derived into `cached_recipe_json.badges.is_budget`.
 */
export type CostLevel = 'Budget' | 'Moderate' | 'Premium';


// ═══════════════════════════════════════════════
// §8. RecipeJson — Main Interface
// ═══════════════════════════════════════════════

/**
 * Complete recipe JSON structure.
 * 
 * This is the **single source of truth** for all recipe-specific data.
 * It is stored as a TEXT blob in `articles.recipe_json` and consumed by:
 * 
 * | Consumer              | File                        | What it reads                    |
 * |-----------------------|-----------------------------|----------------------------------|
 * | RecipeBuilder (admin) | RecipeBuilder.jsx            | All fields (edit UI)             |
 * | RecipeCard (frontend) | RecipeCard.astro             | All fields (render)              |
 * | RecipeMetaPills        | RecipeMetaPills.astro        | prep, cook, total, servings, difficulty, cuisine, diet |
 * | IngredientsSection     | IngredientsSection.astro     | ingredients[]                    |
 * | InstructionsSection    | InstructionsSection.astro    | instructions[]                   |
 * | NutritionFacts         | NutritionFacts.astro         | nutrition                        |
 * | JSON-LD endpoint       | recipes/[slug].ts            | All fields (Schema.org)          |
 * | Recipe list API        | recipes/index.ts             | total, prep, cook, difficulty, servings, rating |
 * | Cached fields sync     | articles.service.ts          | total, difficulty, nutrition, diet, ingredients |
 * 
 * **IMPORTANT — Fields that live at the Article level (NOT here):**
 * `headline`, `short_description`, `images_json`, `author_id`, `category_id`,
 * `published_at`, `slug`, `tags` — these are on the `articles` table.
 */
export interface RecipeJson {
    // ── Time (numeric minutes) ────────────────────
    // Used by RecipeCard stats grid, RecipeMetaPills, and cached scalar indexes.
    // Converted to ISO-8601 (PT##M) for JSON-LD via minutesToIsoDuration().

    /** Active preparation time in minutes @example 15 */
    prep: number | null;

    /** Active cooking time in minutes @example 25 */
    cook: number | null;

    /**
     * Total time in minutes.
     * If null, frontends auto-derive it as `prep + cook`.
     * Synced to `cached_recipe_json.total_time_minutes` for list/card rendering.
     * @example 40
     */
    total: number | null;

    // ── Yield & Servings ──────────────────────────

    /**
     * Numeric servings count — used for ingredient scaling in RecipeCard.
     * The user can increase/decrease this and ingredients scale proportionally.
     * @example 4
     */
    servings: number | null;

    /**
     * Human-readable yield string for JSON-LD `recipeYield`.
     * Different from `servings` — this is descriptive text.
     * @example "12 cookies", "2 loaves", "Serves 4-6"
     */
    recipeYield: string | null;

    // ── Classification ────────────────────────────

    /**
     * Recipe course/category for JSON-LD `recipeCategory`.
     * Shown as "Course: Dessert" pill in RecipeCard header.
     * @example "Dessert", "Breakfast", "Main Course", "Appetizer"
     */
    recipeCategory: string | null;

    /**
     * Cuisine type for JSON-LD `recipeCuisine`.
     * Shown as globe icon pill in RecipeMetaPills.
     * @example "Italian", "Mexican", "French", "Japanese"
     */
    recipeCuisine: string | null;

    /**
     * SEO keywords for JSON-LD `keywords`.
     * @example ["lemon", "blueberry", "quick", "summer"]
     */
    keywords: string[];

    /**
     * Schema.org diet restrictions.
     * Rendered as colored badges in RecipeCard (VeganDiet → green, etc.)
     * Limited to first 2 in RecipeMetaPills compact view.
     */
    suitableForDiet: DietType[];

    /**
     * Recipe difficulty level.
     * Rendered as 1/2/3 bar indicator in RecipeMetaPills.
     * Synced to `cached_recipe_json.difficulty` for list/card rendering.
     */
    difficulty: DifficultyLevel | null;

    /**
     * Cooking method for JSON-LD `cookingMethod`.
     * @example "Baking", "Grilling", "Frying", "Slow cooking", "No-cook"
     */
    cookingMethod: string | null;

    /**
     * Estimated cost level for filtering.
     * Synced to `cached_recipe_json.estimated_cost`; budget flags are derived
     * into `cached_recipe_json.badges.is_budget`.
     */
    estimatedCost: CostLevel | null;

    // ── Structured Content (Core Recipe Data) ─────

    /**
     * Grouped ingredient lists.
     * Each group has a title ("For the Dough") and array of items.
     * Flattened for JSON-LD via `flattenIngredients()`.
     */
    ingredients: IngredientGroup[];

    /**
     * Grouped instruction steps.
     * Each section has a title ("Assembly") and array of steps.
     * Converted to HowToSection/HowToStep for JSON-LD via `toSchemaOrgInstructions()`.
     */
    instructions: InstructionSection[];

    /**
     * Chef's tips — rendered in a "Recipe Notes" section with 💡 icons.
     * Different from step-level tips (which are on InstructionStep.tip).
     */
    tips: string[];

    // ── Nutrition ─────────────────────────────────

    /**
     * Nutrition information per serving (canonical Nutrition Facts payload).
     * Rendered by NutritionFacts.astro in grid or USDA label format.
     * Mapped to Schema.org NutritionInformation for JSON-LD.
     */
    nutrition: NutritionInfo | null;

    // ── Social Proof ──────────────────────────────

    /**
     * Aggregate rating — rendered as star rating in RecipeCard.
     * Maps to Schema.org AggregateRating in JSON-LD.
     */
    aggregateRating: AggregateRating | null;

    // ── Equipment ─────────────────────────────────

    /**
     * Equipment needed — rendered as a checklist section in RecipeCard.
     * Section is hidden if array is empty.
     */
    equipment: EquipmentItem[];

    // ── Video ─────────────────────────────────────

    /**
     * Recipe video — rendered as embedded iframe in RecipeCard.
     * Significantly boosts Google rich snippet visibility.
     * Section is hidden if null.
     */
    video: RecipeVideo | null;
}


// ═══════════════════════════════════════════════
// §9. Default Values
// ═══════════════════════════════════════════════

/**
 * Default empty recipe JSON — used to initialize new recipes.
 * 
 * **This is the single source of truth for default values.**
 * RecipeBuilder.jsx MUST import and use this instead of its own `defaultRecipe`.
 * 
 * Design decisions:
 * - All optional scalars default to `null` (not `''` or `undefined`)
 * - All arrays default to `[]` (not `undefined`)
 * - `nutrition` and `aggregateRating` default to `null` (absence = no data)
 * - No pre-filled groups — user adds groups as needed
 */
export const DEFAULT_RECIPE_JSON: RecipeJson = {
    prep: null,
    cook: null,
    total: null,
    servings: null,
    recipeYield: null,
    recipeCategory: null,
    recipeCuisine: null,
    keywords: [],
    suitableForDiet: [],
    difficulty: null,
    cookingMethod: null,
    estimatedCost: null,
    ingredients: [],
    instructions: [],
    tips: [],
    nutrition: null,
    aggregateRating: null,
    equipment: [],
    video: null,
};


// ═══════════════════════════════════════════════
// §10. Conversion Utilities (JSON-LD Output)
// ═══════════════════════════════════════════════

/**
 * Convert minutes to ISO-8601 duration string for JSON-LD.
 * Returns null for null/zero/negative input so undefined fields are omitted.
 * 
 * @param minutes - Duration in minutes (null-safe)
 * @returns ISO-8601 duration string, or null if no valid duration
 * 
 * @example minutesToIsoDuration(15)  // → "PT15M"
 * @example minutesToIsoDuration(90)  // → "PT1H30M"
 * @example minutesToIsoDuration(60)  // → "PT1H"
 * @example minutesToIsoDuration(null) // → null
 */
export function minutesToIsoDuration(minutes: number | null | undefined): string | null {
    if (!minutes || minutes <= 0) return null;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `PT${mins}M`;
    if (mins === 0) return `PT${hours}H`;
    return `PT${hours}H${mins}M`;
}


/**
 * Parse ISO-8601 duration string back to minutes.
 * Used for migrating legacy data that stored times as ISO strings.
 * 
 * @param duration - ISO-8601 duration string
 * @returns Duration in minutes, or 0 if parsing fails
 * 
 * @example isoDurationToMinutes("PT15M")   // → 15
 * @example isoDurationToMinutes("PT1H30M") // → 90
 * @example isoDurationToMinutes("PT2H")    // → 120
 */
export function isoDurationToMinutes(duration: string | null | undefined): number {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes;
}


/**
 * Format a single ingredient item to a human-readable string.
 * Used for JSON-LD `recipeIngredient` array and print view.
 * 
 * Includes amount, unit, name, prep state, notes, and optional tag.
 * 
 * @param item - Ingredient item to format
 * @returns Formatted string
 * 
 * @example
 * formatIngredient({ amount: 2, unit: "cups", name: "flour", prep: "sifted" })
 * // → "2 cups flour, sifted"
 * 
 * @example
 * formatIngredient({ amount: 0.5, unit: "tsp", name: "salt", isOptional: true })
 * // → "0.5 tsp salt (optional)"
 */
export function formatIngredient(item: IngredientItem): string {
    const parts: string[] = [];

    const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;

    if (amount !== undefined && amount !== null && !isNaN(amount) && amount > 0) {
        const amountStr = Number.isInteger(amount)
            ? amount.toString()
            : amount.toFixed(2).replace(/\.?0+$/, '');
        parts.push(amountStr);
    }

    if (item.unit) parts.push(item.unit);
    parts.push(item.name);
    if (item.prep) parts.push(`, ${item.prep}`);
    if (item.notes) parts.push(`(${item.notes})`);

    let result = parts.join(' ');
    if (item.isOptional) result += ' (optional)';

    return result;
}


/**
 * Flatten all ingredient groups into a single string array.
 * Used for JSON-LD `recipeIngredient` field which requires a flat list.
 * 
 * @param ingredients - Grouped ingredients from RecipeJson
 * @returns Flat array of formatted ingredient strings
 * 
 * @example
 * flattenIngredients([
 *   { group_title: "Dough", items: [{ amount: 2, unit: "cups", name: "flour" }] },
 *   { group_title: "Glaze", items: [{ amount: 1, unit: "cup", name: "sugar" }] }
 * ])
 * // → ["2 cups flour", "1 cup sugar"]
 */
export function flattenIngredients(ingredients: IngredientGroup[]): string[] {
    const result: string[] = [];
    for (const group of ingredients) {
        for (const item of group.items) {
            result.push(formatIngredient(item));
        }
    }
    return result;
}


/**
 * Convert instruction sections to Schema.org HowToStep/HowToSection format.
 * 
 * - Multi-step sections → `HowToSection` containing `HowToStep` items
 * - Single-step sections → flattened to a single `HowToStep`
 * - Step position is globally sequential (1, 2, 3...) across all sections
 * 
 * @param instructions - Grouped instructions from RecipeJson
 * @returns Array of HowToSection/HowToStep objects for JSON-LD
 */
export function toSchemaOrgInstructions(
    instructions: InstructionSection[],
    resolveStepImage?: (imageRef: string) => string | null,
): Array<{ '@type': 'HowToSection' | 'HowToStep';[key: string]: unknown }> {
    const result: Array<{ '@type': 'HowToSection' | 'HowToStep';[key: string]: unknown }> = [];
    let globalStepNumber = 1;

    for (const section of instructions) {
        if (section.section_title && section.steps.length > 1) {
            // Multi-step section → HowToSection wrapper
            result.push({
                '@type': 'HowToSection',
                name: section.section_title,
                itemListElement: section.steps.map((step) => {
                    const stepData: { '@type': 'HowToStep';[key: string]: unknown } = {
                        '@type': 'HowToStep',
                        position: globalStepNumber++,
                        text: step.text,
                    };
                    if (step.name) stepData.name = step.name;
                    if (step.image_ref && resolveStepImage) {
                        const image_url = resolveStepImage(step.image_ref);
                        if (image_url) stepData.image = image_url;
                    }
                    return stepData;
                })
            });
        } else {
            // Single step or no title → flat HowToStep(s)
            for (const step of section.steps) {
                const stepData: { '@type': 'HowToStep';[key: string]: unknown } = {
                    '@type': 'HowToStep',
                    position: globalStepNumber++,
                    text: step.text,
                };
                if (step.name) stepData.name = step.name;
                if (step.image_ref && resolveStepImage) {
                    const image_url = resolveStepImage(step.image_ref);
                    if (image_url) stepData.image = image_url;
                }
                result.push(stepData);
            }
        }
    }

    return result;
}


// ═══════════════════════════════════════════════
// §11. Migration Utilities (Legacy Data Support)
// ═══════════════════════════════════════════════

/**
 * Migrate legacy recipe data to the current RecipeJson format.
 * 
 * Handles these legacy patterns found in existing data:
 * 1. ISO-8601 time strings (`prepTime: "PT15M"`) → numeric minutes (`prep: 15`)
 * 2. Flat string ingredients (`["2 cups flour"]`) → structured IngredientGroup
 * 3. Old `group` key → `group_title` key
 * 4. Old `course` / `cuisine` keys → `recipeCategory` / `recipeCuisine`
 * 5. Legacy camelCase nutrition (`fatContent`, `servingSize`, …) and old
 *    top-level `calories` → canonical snake_case `nutrition` payload.
 *
 * Called by RecipeBuilder.jsx when loading existing data.
 *
 * @param raw - Raw parsed JSON (may be in any legacy format)
 * @returns Normalized RecipeJson object
 */
function firstNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return undefined;
}

/**
 * Map a legacy camelCase or canonical snake_case nutrition object to the
 * canonical {@link NutritionInfo} shape. Returns null when there is no data.
 * Optional fields are only attached when present so the editor shows
 * placeholders for untouched values.
 */
export function migrateNutrition(
    rawNutrition: unknown,
    fallbackCalories: unknown,
    servings: number | null,
): NutritionInfo | null {
    const n = (rawNutrition && typeof rawNutrition === 'object') ? rawNutrition as Record<string, any> : {};

    const calories = firstNumber(n.calories, fallbackCalories);
    const totalFat = firstNumber(n.total_fat_g, n.fatContent);
    const carbs = firstNumber(n.total_carbohydrate_g, n.carbohydrateContent);
    const protein = firstNumber(n.protein_g, n.proteinContent);
    const sodium = firstNumber(n.sodium_mg, n.sodiumContent);

    const ss = (n.serving_size && typeof n.serving_size === 'object') ? n.serving_size as Record<string, any> : null;
    const ssLabel = (ss && typeof ss.label === 'string' && ss.label.trim() !== '')
        ? ss.label
        : (typeof n.servingSize === 'string' && n.servingSize.trim() !== '' ? n.servingSize : undefined);
    const ssGrams = firstNumber(ss?.grams);

    const optional: Record<string, number | undefined> = {
        saturated_fat_g: firstNumber(n.saturated_fat_g, n.saturatedFatContent),
        trans_fat_g: firstNumber(n.trans_fat_g, n.transFatContent),
        cholesterol_mg: firstNumber(n.cholesterol_mg, n.cholesterolContent),
        dietary_fiber_g: firstNumber(n.dietary_fiber_g, n.fiberContent),
        total_sugars_g: firstNumber(n.total_sugars_g, n.sugarContent),
        added_sugars_g: firstNumber(n.added_sugars_g),
        vitamin_d_mcg: firstNumber(n.vitamin_d_mcg),
        calcium_mg: firstNumber(n.calcium_mg),
        iron_mg: firstNumber(n.iron_mg),
        potassium_mg: firstNumber(n.potassium_mg),
    };
    const servingsPerRecipe = firstNumber(n.servings_per_recipe, n.servingsPerRecipe);

    const hasData = [calories, totalFat, carbs, protein, sodium, ssLabel, ssGrams, servingsPerRecipe]
        .concat(Object.values(optional))
        .some((value) => value !== undefined);
    if (!hasData) return null;

    const result: NutritionInfo = {
        basis: 'per_serving',
        serving_size: { label: ssLabel ?? '1 serving', grams: ssGrams ?? 0 },
        servings_per_recipe: servingsPerRecipe ?? servings ?? 1,
        calories: calories ?? 0,
        total_fat_g: totalFat ?? 0,
        sodium_mg: sodium ?? 0,
        total_carbohydrate_g: carbs ?? 0,
        protein_g: protein ?? 0,
        status: 'validated',
    };
    for (const [key, value] of Object.entries(optional)) {
        if (value !== undefined) (result as unknown as Record<string, unknown>)[key] = value;
    }
    return result;
}

/**
 * Map legacy / partial equipment entries to the canonical {@link EquipmentItem}
 * shape so the editor loads a consistent list. `snapshot` is left untouched in
 * the editor — catalog snapshots are (re)copied from the equipment table at
 * article save time. `source_type` is derived from a numeric `equipment_id`.
 *
 * Legacy shapes handled: bare strings, old `{ name, affiliate_url }` items.
 */
export function migrateEquipment(raw: unknown): EquipmentItem[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index): EquipmentItem => {
        const fallbackId = `eq-${index + 1}`;
        if (typeof item === 'string') {
            return { id: fallbackId, equipment_id: null, label: item, required: true, notes: null, source_type: 'manual', snapshot: null };
        }
        if (!item || typeof item !== 'object') {
            return { id: fallbackId, equipment_id: null, label: '', required: true, notes: null, source_type: 'manual', snapshot: null };
        }
        const it = item as Record<string, any>;
        const rawEquipmentId = it.equipment_id ?? it.equipmentId;
        const equipmentId = (typeof rawEquipmentId === 'number' && Number.isFinite(rawEquipmentId) && rawEquipmentId > 0)
            ? rawEquipmentId
            : null;
        const sourceType: 'catalog' | 'manual' = equipmentId !== null ? 'catalog' : 'manual';
        return {
            id: typeof it.id === 'string' && it.id ? it.id : fallbackId,
            equipment_id: equipmentId,
            label: (typeof it.label === 'string' && it.label) ? it.label : (typeof it.name === 'string' ? it.name : ''),
            required: typeof it.required === 'boolean' ? it.required : true,
            notes: (typeof it.notes === 'string' && it.notes.trim() !== '') ? it.notes : null,
            source_type: sourceType,
            snapshot: (sourceType === 'catalog' && it.snapshot && typeof it.snapshot === 'object')
                ? it.snapshot as RecipeEquipmentSnapshot
                : null,
        };
    });
}

export function migrateRecipeJson(raw: Record<string, any>): RecipeJson {
    // Start with defaults, then overlay raw data
    const result: RecipeJson = { ...DEFAULT_RECIPE_JSON, ...raw };

    // ── Migrate ISO time strings to numeric minutes ──
    if (!result.prep && raw.prepTime && typeof raw.prepTime === 'string') {
        result.prep = isoDurationToMinutes(raw.prepTime);
    }
    if (!result.cook && raw.cookTime && typeof raw.cookTime === 'string') {
        result.cook = isoDurationToMinutes(raw.cookTime);
    }
    if (!result.total && raw.totalTime && typeof raw.totalTime === 'string') {
        result.total = isoDurationToMinutes(raw.totalTime);
    }

    // ── Ensure servings is numeric ──
    if (typeof result.servings === 'string') {
        result.servings = parseInt(result.servings as any) || null;
    }

    // ── Migrate old field names ──
    if (!result.recipeCategory && raw.course) {
        result.recipeCategory = raw.course;
    }
    if (!result.recipeCuisine && raw.cuisine) {
        result.recipeCuisine = raw.cuisine;
    }

    // ── Migrate ingredients ──
    let ingredients = raw.ingredients || [];

    if (ingredients.length > 0 && typeof ingredients[0] === 'string') {
        // Flat string array → structured group
        ingredients = [{
            group_title: 'Ingredients',
            items: ingredients.map((text: string) => ({
                name: text,
                amount: 0,
                unit: '',
                isOptional: false,
            })),
        }];
    } else {
        // Ensure all groups have group_title instead of group, and map isOptional correctly
        ingredients = ingredients.map((g: any) => {
            if (g && typeof g === 'object') {
                return {
                    group_title: g.group_title || g.group || 'Ingredients',
                    items: (g.items || []).map((item: any) => {
                        if (typeof item === 'string') {
                            return { name: item, amount: 0, unit: '', isOptional: false };
                        }
                        if (item && typeof item === 'object') {
                            return {
                                ...item,
                                isOptional: item.isOptional ?? item.is_optional ?? false,
                            };
                        }
                        return item;
                    }),
                };
            }
            return g;
        });
    }
    result.ingredients = ingredients;

    // ── Migrate instructions ──
    let instructions = raw.instructions || [];

    if (instructions.length > 0 && instructions[0].text !== undefined && !instructions[0].steps) {
        // Flat step array → single section
        instructions = [{
            section_title: 'Steps',
            steps: instructions.map((i: any) => ({
                text: typeof i === 'string' ? i : i.text || '',
            })),
        }];
    } else if (instructions.length > 0 && instructions[0].group !== undefined) {
        // Old `{ group, steps }` format → `{ section_title, steps }`
        instructions = instructions.map((g: any) => ({
            section_title: g.group || g.section_title || 'Steps',
            steps: (g.steps || []).map((step: any) =>
                typeof step === 'string'
                    ? { text: step }
                    : step
            ),
        }));
    }
    result.instructions = instructions;

    // ── Migrate nutrition (legacy camelCase / old top-level calories → canonical) ──
    result.nutrition = migrateNutrition(raw.nutrition, raw.calories, result.servings);

    // ── Ensure arrays are never undefined ──
    result.keywords = result.keywords || [];
    result.suitableForDiet = result.suitableForDiet || [];
    result.tips = result.tips || [];
    result.equipment = migrateEquipment(raw.equipment);

    // ── Clean up legacy keys from the spread ──
    delete (result as any).prepTime;
    delete (result as any).cookTime;
    delete (result as any).totalTime;
    delete (result as any).course;
    delete (result as any).cuisine;
    delete (result as any).calories;

    return result;
}
