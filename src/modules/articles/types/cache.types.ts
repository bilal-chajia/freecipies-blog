/**
 * Cache Field Types
 * ===================
 * TypeScript types for cached_* JSON fields
 * Zero-join rendering optimization
 */

import type { ImageSlot, ImageVariants } from './images.types';

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

    /** Optional SVG icon */
    icon_svg?: string;

    /** Category color */
    color?: string;
}

// ============================================
// Cached Tags
// ============================================

export type CachedTagsJson = string[];

// ============================================
// Cached Equipment
// ============================================

export interface CachedEquipmentItem {
    /** Equipment ID */
    id: number;

    /** Display name */
    name: string;

    /** URL slug */
    slug: string;

    /** Affiliate link URL */
    affiliate_url?: string;

    /** Product image URL */
    image_url?: string;

    /** Whether required for recipe */
    required: boolean;
}

export type CachedEquipmentJson = CachedEquipmentItem[];

// ============================================
// Cached Rating
// ============================================

export interface CachedRatingJson {
    /** Average rating (1-5 or null) */
    ratingValue: number | null;

    /** Total number of ratings */
    ratingCount: number;
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
    isRecipe: boolean;

    /** Total time in minutes */
    totalTimeMinutes?: number | null;

    /** Difficulty level */
    difficulty?: string | null;

    /** Number of servings */
    servings?: number | null;

    /** Calories per serving */
    caloriesPerServing?: number | null;

    /** Diet labels for badges */
    primaryDietLabels?: string[];

    /** Occasion labels (Christmas, Weeknight) */
    primaryOccasionLabels?: string[];

    /** Main ingredients for search */
    mainIngredients?: string[];

    /** Under 30 min flag */
    isQuick?: boolean;

    /** Meets healthy criteria */
    isHealthy?: boolean;

    /** Budget-friendly flag */
    isBudget?: boolean;
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

    /** Thumbnail image */
    thumbnail?: {
        alt?: string;
        variants?: ImageVariants;
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
// Related Articles
// ============================================

export interface CachedRelatedCard {
    id: number;
    slug: string;
    headline: string;
    thumbnail?: {
        alt?: string;
        variants?: ImageVariants;
    };

    // Type-specific fields
    total_time?: number;
    difficulty?: string;
    reading_time?: number;
    item_count?: number;
}

export interface RelatedArticlesJson {
    /** Related recipe cards */
    recipes?: CachedRelatedCard[];

    /** Related article cards */
    articles?: CachedRelatedCard[];

    /** Related roundup cards */
    roundups?: CachedRelatedCard[];
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
    ratingValue: null,
    ratingCount: 0,
};

export const DEFAULT_CACHED_RECIPE: CachedRecipeJson = {
    isRecipe: false,
    totalTimeMinutes: null,
    difficulty: null,
    servings: null,
    caloriesPerServing: null,
    primaryDietLabels: [],
    primaryOccasionLabels: [],
    mainIngredients: [],
    isQuick: false,
    isHealthy: false,
    isBudget: false,
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
