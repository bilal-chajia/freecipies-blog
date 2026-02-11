/**
 * Recipe Types - Food Blog CMS Optimized
 * =======================================
 * Dual-purpose types for:
 * 1. Interactive recipe card UI (scaling, timers, checkboxes)
 * 2. Google Recipe rich snippet JSON-LD generation
 * 
 * Aligned with schema.sql recipe_json structure
 * @see db/schema.sql lines 1344-1488
 */

// ============================================
// Nutrition (Schema.org NutritionInformation)
// ============================================

/**
 * Nutrition data stored as numbers for UI calculations
 * Formatted to strings with units for JSON-LD output
 * 
 * CRITICAL: servingSize is REQUIRED by Google if nutrition is provided
 * @see https://developers.google.com/search/docs/appearance/structured-data/recipe
 */
export interface NutritionInfo {
    /** 
     * Serving size description - REQUIRED by Google if nutrition present
     * @example "1 cookie (80g)", "1 cup", "Serves 4"
     */
    servingSize?: string;

    /** Calories per serving in kcal (e.g., 320) */
    calories?: number;

    /** Total fat in grams (e.g., 15) */
    fatContent?: number;

    /** Saturated fat in grams (e.g., 3) */
    saturatedFatContent?: number;

    /** Unsaturated fat in grams (e.g., 12) */
    unsaturatedFatContent?: number;

    /** Trans fat in grams (e.g., 0) */
    transFatContent?: number;

    /** Total carbohydrates in grams (e.g., 40) */
    carbohydrateContent?: number;

    /** Sugar in grams (e.g., 12) */
    sugarContent?: number;

    /** Dietary fiber in grams (e.g., 2) */
    fiberContent?: number;

    /** Protein in grams (e.g., 4) */
    proteinContent?: number;

    /** Sodium in milligrams (e.g., 220) */
    sodiumContent?: number;

    /** Cholesterol in milligrams (e.g., 25) */
    cholesterolContent?: number;
}

/**
 * Schema.org NutritionInformation format for JSON-LD output
 */
export interface SchemaOrgNutrition {
    '@type': 'NutritionInformation';
    servingSize?: string;           // "1 biscuit (80g)"
    calories?: string;              // "320 calories"
    fatContent?: string;            // "15g"
    saturatedFatContent?: string;   // "3g"
    unsaturatedFatContent?: string; // "12g"
    transFatContent?: string;       // "0g"
    carbohydrateContent?: string;   // "40g"
    sugarContent?: string;          // "12g"
    fiberContent?: string;          // "2g"
    proteinContent?: string;        // "4g"
    sodiumContent?: string;         // "220mg"
    cholesterolContent?: string;    // "25mg"
}

// ============================================
// Ingredients
// ============================================

export interface IngredientSubstitute {
    name: string;
    ratio?: string;        // e.g., "1:1"
    notes?: string;        // e.g., "denser result"
}

/**
 * Individual ingredient item
 * Supports both UI display and JSON-LD formatting
 */
export interface IngredientItem {
    /** Stable ID for UI/shopping lists */
    id?: string;

    /** 
     * Amount as FLOAT for scaling calculations
     * @example 315.0, 0.5, 2.5
     */
    amount: number;

    /** Unit of measurement */
    unit: string;          // "grams", "cups", "tbsp"

    /** Ingredient name */
    name: string;          // "all-purpose flour"

    /** 
     * Preparation state for this ingredient
     * Shown in recipe card ingredient list
     * @example "diced", "minced", "room temperature", "sifted", "melted"
     */
    prep?: string;

    /** Additional notes shown in UI */
    notes?: string;        // "sifted", "room temperature"

    /** Whether ingredient is optional */
    isOptional?: boolean;

    /** Alternative ingredients for substitutions feature */
    substitutes?: IngredientSubstitute[];
}

/**
 * Group of ingredients (e.g., "Dough", "Glaze", "Filling")
 */
export interface IngredientGroup {
    /** Group title for UI */
    group_title: string;   // "Dough", "Glaze"

    /** Ingredients in this group */
    items: IngredientItem[];
}

// ============================================
// Instructions
// ============================================

/**
 * Individual recipe step
 * Supports timers for UI and step linking for SEO
 */
export interface InstructionStep {
    /** Optional step title */
    name?: string;         // "Mix dry ingredients"

    /** Step description - supports markdown */
    text: string;          // "Whisk flour and sugar together."

    /** Step image URL for visual guidance */
    image?: string | null;

    /** 
     * Timer in SECONDS for UI timer feature
     * @example 1200 = 20 minutes
     */
    timer?: number;

    /**
     * Step-level tip/note
     * Displayed below the instruction in recipe card (smaller, muted style)
     * @example "Don't overmix or cookies will be tough"
     * @example "If dough is sticky, chill 10 minutes"
     * @example "Look for golden edges as done indicator"
     */
    tip?: string;
}

/**
 * Section of instructions (e.g., "Make the dough", "Prepare the filling")
 */
export interface InstructionSection {
    /** Section title */
    section_title: string; // "Make the dough"

    /** Steps in this section */
    steps: InstructionStep[];
}

// ============================================
// Equipment & Video
// ============================================

/**
 * Equipment reference linking to equipment table
 */
export interface EquipmentRef {
    /** Reference to equipment table ID */
    equipment_id: number;

    /** Whether equipment is required */
    required: boolean;

    /** Notes about usage */
    notes?: string;        // "or use hand mixer"
}

/**
 * Video content for recipe
 * Significantly enhances Google rich snippet visibility
 */
export interface RecipeVideo {
    /** Video URL (YouTube, Vimeo, or direct) */
    url: string;

    /** Video title */
    name: string;

    /** Video description */
    description?: string;

    /** Thumbnail image URL */
    thumbnailUrl?: string;

    /** 
     * Duration in ISO-8601 format
     * @example "PT2M30S" = 2 minutes 30 seconds
     */
    duration: string;

    /** Upload date in ISO-8601 format */
    uploadDate?: string;
}

// ============================================
// Aggregate Rating
// ============================================

export interface AggregateRating {
    /** Average rating value (e.g., 4.8) */
    ratingValue: number | null;

    /** Number of ratings (e.g., 55) */
    ratingCount: number;
}

// ============================================
// Diet Types (Schema.org RestrictedDiet)
// ============================================

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

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

// ============================================
// Complete Recipe JSON (matches schema.sql)
// ============================================

/**
 * Recipe JSON Structure
 * 
 * This is the source of truth for recipe data stored in the database.
 * It serves dual purposes:
 * 1. Powers the interactive recipe card UI
 * 2. Generates Schema.org JSON-LD for Google rich snippets
 * 
 * @see db/schema.sql lines 1344-1372 for database schema
 */
export interface RecipeJson {
    // ==========================================
    // TIME (numeric minutes for UI/filters)
    // Converted to ISO-8601 for JSON-LD output
    // ==========================================
    prep?: number | null;          // Active prep time (minutes)
    cook?: number | null;          // Active cook time (minutes)
    total?: number | null;         // Total time (minutes)

    // ==========================================
    // TIME (ISO-8601 strings - legacy support)
    // Modern code should use numeric fields above
    // ==========================================
    prepTime?: string | null;      // "PT15M"
    cookTime?: string | null;      // "PT25M"
    totalTime?: string | null;     // "PT40M"

    // ==========================================
    // SERVINGS & YIELD
    // ==========================================
    /** 
     * Numeric servings for UI scaling feature
     * @example 4, 12
     */
    servings?: number | null;

    /** 
     * Human-readable yield string for JSON-LD
     * REQUIRED by Google if nutrition is provided
     * @example "12 cookies", "Serves 4", "Makes 2 loaves"
     */
    recipeYield?: string | null;

    // ==========================================
    // METADATA (Schema.org)
    // ==========================================
    recipeCategory?: string | null;    // "Dessert", "Breakfast", "Main Course"
    recipeCuisine?: string | null;     // "Italian", "Mexican", "American"
    keywords?: string[];               // ["lemon", "blueberry", "quick"]
    suitableForDiet?: DietType[];      // ["VeganDiet", "GlutenFreeDiet"]

    // ==========================================
    // RECIPE INFO
    // ==========================================
    difficulty?: DifficultyLevel | null;   // "Easy", "Medium", "Hard"
    cookingMethod?: string | null;         // "baking", "grilling", "frying"
    estimatedCost?: string | null;         // "Budget", "Moderate", "Premium"

    // ==========================================
    // STRUCTURED DATA (Core Recipe Content)
    // ==========================================
    /** 
     * Grouped ingredients for UI and JSON-LD
     * @see IngredientGroup
     */
    ingredients: IngredientGroup[];

    /**
     * Grouped instructions for UI and JSON-LD
     * @see InstructionSection
     */
    instructions: InstructionSection[];

    /** Chef's tips array for recipe card */
    tips?: string[];

    // ==========================================
    // NUTRITION
    // ==========================================
    /** 
     * Nutrition information per serving
     * CRITICAL: servingSize is REQUIRED if nutrition is provided
     */
    nutrition?: NutritionInfo;

    // ==========================================
    // RATINGS
    // ==========================================
    aggregateRating?: AggregateRating;

    // ==========================================
    // EQUIPMENT
    // ==========================================
    equipment?: EquipmentRef[];

    // ==========================================
    // VIDEO
    // ==========================================
    video?: RecipeVideo | null;
}

// ============================================
// Conversion Utilities
// ============================================

/**
 * Convert internal NutritionInfo to Schema.org format
 */
export function toSchemaOrgNutrition(nutrition: NutritionInfo): SchemaOrgNutrition {
    return {
        '@type': 'NutritionInformation',
        ...(nutrition.servingSize && { servingSize: nutrition.servingSize }),
        ...(nutrition.calories !== undefined && { calories: `${nutrition.calories} calories` }),
        ...(nutrition.fatContent !== undefined && { fatContent: `${nutrition.fatContent}g` }),
        ...(nutrition.saturatedFatContent !== undefined && { saturatedFatContent: `${nutrition.saturatedFatContent}g` }),
        ...(nutrition.unsaturatedFatContent !== undefined && { unsaturatedFatContent: `${nutrition.unsaturatedFatContent}g` }),
        ...(nutrition.transFatContent !== undefined && { transFatContent: `${nutrition.transFatContent}g` }),
        ...(nutrition.carbohydrateContent !== undefined && { carbohydrateContent: `${nutrition.carbohydrateContent}g` }),
        ...(nutrition.sugarContent !== undefined && { sugarContent: `${nutrition.sugarContent}g` }),
        ...(nutrition.fiberContent !== undefined && { fiberContent: `${nutrition.fiberContent}g` }),
        ...(nutrition.proteinContent !== undefined && { proteinContent: `${nutrition.proteinContent}g` }),
        ...(nutrition.sodiumContent !== undefined && { sodiumContent: `${nutrition.sodiumContent}mg` }),
        ...(nutrition.cholesterolContent !== undefined && { cholesterolContent: `${nutrition.cholesterolContent}mg` }),
    };
}

/**
 * Convert minutes to ISO-8601 duration
 * @example 15 -> "PT15M"
 * @example 90 -> "PT1H30M"
 */
export function minutesToIsoDuration(minutes: number): string {
    if (minutes < 60) {
        return `PT${minutes}M`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `PT${hours}H`;
    }
    return `PT${hours}H${mins}M`;
}

/**
 * Parse ISO-8601 duration to minutes
 * @example "PT15M" -> 15
 * @example "PT1H30M" -> 90
 */
export function isoDurationToMinutes(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes;
}

/**
 * Format ingredient for display and JSON-LD
 * @example { amount: 2, unit: "cups", name: "flour", notes: "sifted" }
 *       -> "2 cups flour, sifted"
 */
export function formatIngredient(item: IngredientItem): string {
    const parts: string[] = [];
    
    if (item.amount) {
        // Format number (remove trailing zeros)
        const amountStr = Number.isInteger(item.amount)
            ? item.amount.toString()
            : item.amount.toFixed(2).replace(/\.?0+$/, '');
        parts.push(amountStr);
    }
    
    if (item.unit) parts.push(item.unit);
    parts.push(item.name);
    if (item.notes) parts.push(`, ${item.notes}`);
    
    let result = parts.join(' ');
    if (item.isOptional) result += ' (optional)';
    
    return result;
}

/**
 * Flatten ingredients for JSON-LD recipeIngredient field
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
 * Convert instructions to Schema.org HowToStep/HowToSection format
 */
export function toSchemaOrgInstructions(
    instructions: InstructionSection[],
    baseUrl: string
): Array<{ '@type': 'HowToSection' | 'HowToStep'; [key: string]: unknown }> {
    const result: Array<{ '@type': 'HowToSection' | 'HowToStep'; [key: string]: unknown }> = [];
    let globalStepNumber = 1;

    for (const section of instructions) {
        if (section.section_title && section.steps.length > 1) {
            // Multi-step section → HowToSection
            result.push({
                '@type': 'HowToSection',
                name: section.section_title,
                itemListElement: section.steps.map((step) => {
                    const stepData: { '@type': 'HowToStep'; [key: string]: unknown } = {
                        '@type': 'HowToStep',
                        position: globalStepNumber++,
                        text: step.text,
                    };
                    if (step.name) stepData.name = step.name;
                    if (step.image) stepData.image = step.image;
                    return stepData;
                })
            });
        } else {
            // Single step or no section → flat HowToStep
            for (const step of section.steps) {
                const stepData: { '@type': 'HowToStep'; [key: string]: unknown } = {
                    '@type': 'HowToStep',
                    position: globalStepNumber++,
                    text: step.text,
                };
                if (step.name) stepData.name = step.name;
                if (step.image) stepData.image = step.image;
                result.push(stepData);
            }
        }
    }

    return result;
}

// ============================================
// Default Values
// ============================================

/**
 * Default empty recipe JSON
 * Matches schema.sql DEFAULT value
 */
export const DEFAULT_RECIPE_JSON: RecipeJson = {
    prep: null,
    cook: null,
    total: null,
    prepTime: null,
    cookTime: null,
    totalTime: null,
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
    nutrition: undefined,
    aggregateRating: undefined,
    equipment: [],
    video: null,
};
