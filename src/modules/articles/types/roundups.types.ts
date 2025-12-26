/**
 * Roundup Types
 * ==============
 * TypeScript types for roundup_json field
 * Based on schema.org/ItemList for SEO
 */

import type { ImageVariants } from './images.types';

// ============================================
// Roundup Item
// ============================================

export interface RoundupItemCover {
    /** Alt text for image */
    alt?: string;

    /** Responsive image variants */
    variants?: ImageVariants;
}

export interface RoundupItem {
    /** Position in the list (1-indexed for Schema.org) */
    position: number;

    /** Reference to internal article ID (optional) */
    article_id?: number;

    /** External URL if not internal article */
    external_url?: string;

    /** Display title */
    title: string;

    /** Optional subtitle/tagline */
    subtitle?: string;

    /** Editorial note about this item */
    note?: string;

    /** Cover image for card display */
    cover?: RoundupItemCover;
}

// ============================================
// Roundup JSON
// ============================================

export type RoundupListType = 'ItemList';

export interface RoundupJson {
    /** Schema.org list type */
    listType: RoundupListType;

    /** Collection of roundup items */
    items: RoundupItem[];
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_ROUNDUP_JSON: RoundupJson = {
    listType: 'ItemList',
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
            ...(item.article_id && { url: `${baseUrl}/recipes/${item.article_id}` }),
            ...(item.external_url && { url: item.external_url }),
            ...(item.cover?.variants?.lg?.url && { image: item.cover.variants.lg.url }),
            ...(item.subtitle && { description: item.subtitle }),
        })),
    };
}
