/**
 * Roundup Types
 * ==============
 * TypeScript types for roundup_json field
 * Stored JSON uses snake_case. Schema.org output is produced at the JSON-LD
 * boundary only.
 */

import type { ImageVariants } from './images.types';
import { resolveVariantUrl } from '@shared/types/images';

// ============================================
// Roundup Item
// ============================================

export interface RoundupItemImage {
    alt?: string;
    caption?: string;
    placeholder?: string;
    aspect_ratio?: string;
    variants?: ImageVariants;
}

export interface RoundupItemRecipeSnapshot {
    total_time_minutes?: number | null;
    difficulty?: string | null;
    servings?: number | null;
}

export interface RoundupItemRatingSnapshot {
    rating_value?: number | null;
    rating_count?: number | null;
}

export interface RoundupItemLabelSnapshot {
    id?: number;
    name: string;
    slug?: string;
    url?: string;
}

export interface RoundupItem {
    /** Position in the list (1-indexed for Schema.org) */
    position: number;

    /** Contract source discriminator */
    source_type: 'internal_recipe' | 'external_recipe';

    /** Reference to internal article ID (optional) */
    article_id?: number;

    /** Internal recipe slug for public links */
    slug?: string;

    /** External URL if not internal article */
    external_url?: string;

    /** Display title */
    title: string;

    /** Optional subtitle/tagline */
    subtitle?: string;

    /** Resolved card description or roundup-specific description */
    description?: string;

    /** Editorial note about this item */
    note?: string;

    /** Resolved hero snapshot for roundup card display */
    image?: RoundupItemImage;

    recipe?: RoundupItemRecipeSnapshot;
    rating?: RoundupItemRatingSnapshot;
    author?: RoundupItemLabelSnapshot;
    category?: RoundupItemLabelSnapshot;
    tags?: RoundupItemLabelSnapshot[];
}

// ============================================
// Roundup JSON
// ============================================

export type RoundupListType = 'ItemList';

export interface RoundupJson {
    /** Schema.org list type */
    list_type: RoundupListType;

    /** Collection of roundup items */
    items: RoundupItem[];

    /** Optional editorial heading shown above the roundup list. */
    group_title?: string;

    /** Optional editorial description shown under the group heading. */
    group_description?: string;

    /** Whether recipe stat badges (time/difficulty/rating) render on each card. Defaults to true. */
    show_stats?: boolean;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_ROUNDUP_JSON: RoundupJson = {
    list_type: 'ItemList',
    items: [],
};

// ============================================
// Schema.org ItemList (JSON-LD Output)
// ============================================

export interface SchemaOrgItemList {
    '@type': 'ItemList';
    itemListElement: {
        '@type': 'ListItem';
        position: number;
        name: string;
        url?: string;
        image?: string;
        description?: string;
    }[];
}

/**
 * Convert RoundupJson to Schema.org ItemList format
 */
export function toSchemaOrgItemList(
    roundup: RoundupJson,
    baseUrl: string
): SchemaOrgItemList {
    return {
        '@type': 'ItemList',
        itemListElement: roundup.items.map(item => ({
            '@type': 'ListItem',
            position: item.position,
            name: item.title,
            ...(item.source_type === 'internal_recipe' && item.slug && { url: `${baseUrl}/recipes/${item.slug}` }),
            ...(item.external_url && { url: item.external_url }),
            ...(item.image?.variants?.md && { image: resolveVariantUrl(item.image.variants.md) || undefined }),
            ...((item.description || item.subtitle) && { description: item.description || item.subtitle }),
        })),
    };
}
