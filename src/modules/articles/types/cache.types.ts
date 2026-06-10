/**
 * Cache Field Types
 * ===================
 * TypeScript types for cached_* JSON fields
 * Zero-join rendering optimization
 */

import type { ImageVariants, StoredImageVariants } from './images.types';

// ============================================
// Cached Author
// ============================================

export interface CachedAuthorJson {
    /** Author ID */
    id: number;

    /** URL slug */
    slug: string;

    /** Display name */
    name: string;

    /** Job title / role */
    job_title?: string;

    /** Avatar image */
    avatar?: {
        url: string;
        alt?: string;
    };
}

// ============================================
// Cached Category
// ============================================

export interface CachedCategoryJson {
    /** Category ID */
    id: number;

    /** URL slug */
    slug: string;

    /** Display name */
    name: string;

    /** Category color */
    color?: string;
}

// ============================================
// Cached Tags
// ============================================

export type CachedTagsJson = string[];

// ============================================
// Cached Rating
// ============================================

export interface CachedRatingJson {
    /** Average rating (1-5 or null) */
    rating_value: number | null;

    /** Total number of ratings */
    rating_count: number;
}

// ============================================
// Cached TOC (Table of Contents)
// ============================================

export interface CachedTocItem {
    /** Anchor ID (slugified heading) */
    id: string;

    /** Heading text */
    text: string;

    /** Heading level (2-6) */
    level: 2 | 3 | 4 | 5 | 6;
}

export type CachedTocJson = CachedTocItem[];

// ============================================
// Cached Recipe (for listings/filters)
// ============================================

export interface CachedRecipeJson {
    /** Quick flag for card type selection */
    is_recipe: boolean;

    prep_time_minutes?: number | null;

    cook_time_minutes?: number | null;

    /** Total time in minutes */
    total_time_minutes?: number | null;

    /** Difficulty level */
    difficulty?: string | null;

    /** Number of servings */
    servings?: number | null;

    recipe_yield?: string | null;

    recipe_category?: string | null;

    recipe_cuisine?: string | null;

    cooking_method?: string | null;

    estimated_cost?: string | null;

    /** Calories per serving */
    calories_per_serving?: number | null;

    protein_g?: number | null;

    carbohydrate_g?: number | null;

    fat_g?: number | null;

    /** Diet labels for badges */
    diet_labels?: string[];

    /** Keyword labels for filters/search */
    keyword_labels?: string[];

    /** Main ingredients for search */
    main_ingredients?: string[];

    badges?: {
        is_quick?: boolean;
        is_budget?: boolean;
        is_healthy?: boolean;
        is_high_protein?: boolean;
        is_low_calorie?: boolean;
        is_vegetarian?: boolean;
        is_vegan?: boolean;
        is_gluten_free?: boolean;
        is_dairy_free?: boolean;
    };
}

// ============================================
// Cached Card (for pickers/listings)
// ============================================

export interface CachedCardJson {
    /** Article ID */
    id: number;

    /** Content type */
    type: 'article' | 'recipe' | 'roundup';

    /** URL slug */
    slug: string;

    /** Display title */
    headline: string;

    /** Short description */
    short_description?: string;

    /**
     * Card image slot (stored snapshot per ARTICLE_CACHED_FIELDS_CONTRACT:
     * variants carry r2_key; the API/render boundary resolves them to url).
     */
    image?: {
        media_id?: number;
        alt?: string;
        variants?: StoredImageVariants;
        placeholder?: string;
        aspect_ratio?: string;
        focal_point?: { x: number; y: number };
    };

    // Recipe-specific (when type='recipe')
    total_time?: number;
    difficulty?: string;
    servings?: number;
    rating?: CachedRatingJson;

    // Article-specific (when type='article')
    reading_time?: number;

    // Roundup-specific (when type='roundup')
    item_count?: number;
}

// ============================================
// FAQs JSON (aggregated from content blocks)
// ============================================

export interface CachedFAQItem {
    /** Question */
    q: string;

    /** Answer */
    a: string;
}

export type FAQsJson = CachedFAQItem[];

// ============================================
// Config JSON
// ============================================

export interface ConfigJson {
    /** Show table of contents */
    showToc?: boolean;

    /** Show author bio box */
    showAuthor?: boolean;

    /** Show related content section */
    showRelated?: boolean;

    /** Show newsletter signup */
    showNewsletter?: boolean;

    /** Enable comments */
    enableComments?: boolean;

    /** Show print button (recipes) */
    showPrintButton?: boolean;

    /** Show jump to recipe button */
    showJumpToRecipe?: boolean;

    /** Custom CSS classes */
    customClasses?: string;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_CACHED_AUTHOR: CachedAuthorJson = {
    id: 0,
    slug: '',
    name: '',
};

export const DEFAULT_CACHED_CATEGORY: CachedCategoryJson = {
    id: 0,
    slug: '',
    name: '',
};

export const DEFAULT_CACHED_RATING: CachedRatingJson = {
    rating_value: null,
    rating_count: 0,
};

export const DEFAULT_CACHED_RECIPE: CachedRecipeJson = {
    is_recipe: false,
    prep_time_minutes: null,
    cook_time_minutes: null,
    total_time_minutes: null,
    difficulty: null,
    servings: null,
    recipe_yield: null,
    recipe_category: null,
    recipe_cuisine: null,
    cooking_method: null,
    estimated_cost: null,
    calories_per_serving: null,
    protein_g: null,
    carbohydrate_g: null,
    fat_g: null,
    diet_labels: [],
    keyword_labels: [],
    main_ingredients: [],
    badges: {
        is_quick: false,
        is_budget: false,
        is_healthy: false,
        is_high_protein: false,
        is_low_calorie: false,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: false,
        is_dairy_free: false,
    },
};

export const DEFAULT_CONFIG: ConfigJson = {
    showToc: true,
    showAuthor: true,
    showRelated: true,
    showNewsletter: true,
    enableComments: false,
    showPrintButton: true,
    showJumpToRecipe: true,
};
