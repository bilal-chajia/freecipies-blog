/**
 * Recipe Types - Schema.org Compliant
 * =====================================
 * Complete TypeScript types for recipe_json field
 * Based on schema.org/Recipe and schema.org/NutritionInformation
 */

// ============================================
// Nutrition (Schema.org NutritionInformation)
// ============================================

/**
 * Internal nutrition storage format (numbers for calculations)
 * All values are stored as numbers and formatted to strings for JSON-LD output
 */
export interface NutritionInfo {
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

    /** Serving size description (e.g., "1 biscuit (80g)") */
    servingSize?: string;
}

/**
 * Schema.org NutritionInformation format (for JSON-LD output)
 */
export interface SchemaOrgNutrition {
    '@type': 'NutritionInformation';
    calories?: string;              // "320 kcal"
    fatContent?: string;            // "15 g"
    saturatedFatContent?: string;   // "3 g"
    unsaturatedFatContent?: string; // "12 g"
    transFatContent?: string;       // "0 g"
    carbohydrateContent?: string;   // "40 g"
    sugarContent?: string;          // "12 g"
    fiberContent?: string;          // "2 g"
    proteinContent?: string;        // "4 g"
    sodiumContent?: string;         // "220 mg"
    cholesterolContent?: string;    // "25 mg"
    servingSize?: string;           // "1 biscuit (80g)"
}

// ============================================
// Ingredients
// ============================================

export interface IngredientSubstitute {
    name: string;
    ratio?: string;        // e.g., "1:1"
    notes?: string;        // e.g., "denser result"
}

export interface IngredientItem {
    /** Stable ID for UI/shopping lists */
    id?: string;

    /** Amount as FLOAT for scaling (e.g., 315.0) */
    amount: number;

    /** Unit of measurement (e.g., "grams", "cups") */
    unit: string;

    /** Ingredient name (e.g., "all-purpose flour") */
    name: string;

    /** Additional notes (e.g., "sifted") */
    notes?: string;

    /** Whether ingredient is optional */
    isOptional?: boolean;

    /** Alternative ingredients */
    substitutes?: IngredientSubstitute[];
}

export interface IngredientGroup {
    /** Group title (e.g., "Dough", "Glaze") */
    group_title: string;

    /** Ingredients in this group */
    items: IngredientItem[];
}

// ============================================
// Instructions
// ============================================

export interface InstructionStep {
    /** Optional step title (e.g., "Mix dry ingredients") */
    name?: string;

    /** Step description (required) */
    text: string;

    /** Optional step image URL */
    image?: string | null;

    /** Timer in SECONDS (e.g., 1200 = 20 minutes) */
    timer?: number;
}

export interface InstructionSection {
    /** Section title (e.g., "Make the dough") */
    section_title: string;

    /** Steps in this section */
    steps: InstructionStep[];
}

// ============================================
// Equipment & Video
// ============================================

export interface EquipmentRef {
    /** Reference to equipment table ID */
    equipment_id: number;

    /** Whether equipment is required */
    required: boolean;

    /** Alternative/notes (e.g., "or use hand mixer") */
    notes?: string;
}

export interface RecipeVideo {
    /** Video URL */
    url: string;

    /** Video title */
    name: string;

    /** Video description */
    description?: string;

    /** Thumbnail image URL */
    thumbnailUrl?: string;

    /** Duration in ISO-8601 format (e.g., "PT2M30S") */
    duration: string;
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
// Complete Recipe JSON
// ============================================

export interface RecipeJson {
    // TIME (numeric minutes for UI/filters)
    prep?: number | null;
    cook?: number | null;
    total?: number | null;

    // TIME (ISO-8601 for Schema.org JSON-LD)
    prepTime?: string | null;      // "PT15M"
    cookTime?: string | null;      // "PT25M"
    totalTime?: string | null;     // "PT40M"

    // SERVINGS
    servings?: number | null;      // For scaling UI (e.g., 4)
    recipeYield?: string | null;   // For JSON-LD (e.g., "Makes 12 cookies")

    // METADATA (Schema.org)
    recipeCategory?: string | null;    // "Dessert", "Breakfast"
    recipeCuisine?: string | null;     // "Italian", "Mexican"
    keywords?: string[];               // ["lemon", "blueberry", "biscuits"]
    suitableForDiet?: DietType[];      // ["VeganDiet", "GlutenFreeDiet"]

    // RECIPE INFO
    difficulty?: DifficultyLevel | null;
    cookingMethod?: string | null;     // "baking", "grilling"
    estimatedCost?: string | null;     // "Budget", "Moderate", "Premium"

    // STRUCTURED DATA
    ingredients: IngredientGroup[];
    instructions: InstructionSection[];
    tips?: string[];                   // Chef's tips array

    // NUTRITION (Schema.org NutritionInformation)
    nutrition?: NutritionInfo;

    // RATINGS
    aggregateRating?: AggregateRating;

    // EQUIPMENT (references equipment table)
    equipment?: EquipmentRef[];

    // VIDEO
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
        ...(nutrition.calories !== undefined && { calories: `${nutrition.calories} kcal` }),
        ...(nutrition.fatContent !== undefined && { fatContent: `${nutrition.fatContent} g` }),
        ...(nutrition.saturatedFatContent !== undefined && { saturatedFatContent: `${nutrition.saturatedFatContent} g` }),
        ...(nutrition.unsaturatedFatContent !== undefined && { unsaturatedFatContent: `${nutrition.unsaturatedFatContent} g` }),
        ...(nutrition.transFatContent !== undefined && { transFatContent: `${nutrition.transFatContent} g` }),
        ...(nutrition.carbohydrateContent !== undefined && { carbohydrateContent: `${nutrition.carbohydrateContent} g` }),
        ...(nutrition.sugarContent !== undefined && { sugarContent: `${nutrition.sugarContent} g` }),
        ...(nutrition.fiberContent !== undefined && { fiberContent: `${nutrition.fiberContent} g` }),
        ...(nutrition.proteinContent !== undefined && { proteinContent: `${nutrition.proteinContent} g` }),
        ...(nutrition.sodiumContent !== undefined && { sodiumContent: `${nutrition.sodiumContent} mg` }),
        ...(nutrition.cholesterolContent !== undefined && { cholesterolContent: `${nutrition.cholesterolContent} mg` }),
        ...(nutrition.servingSize && { servingSize: nutrition.servingSize }),
    };
}

/**
 * Convert minutes to ISO-8601 duration
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
 */
export function isoDurationToMinutes(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    return hours * 60 + minutes;
}

/**
 * Default empty recipe JSON
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
    prepTime: null,
    cookTime: null,
    totalTime: null,
    ingredients: [],
    instructions: [],
    tips: [],
    nutrition: {},
    aggregateRating: { ratingValue: null, ratingCount: 0 },
    equipment: [],
    video: null,
};
