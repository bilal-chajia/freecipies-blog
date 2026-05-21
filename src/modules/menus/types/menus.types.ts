/**
 * Menus Module - Type Definitions
 * ================================
 * TypeScript interfaces for mega menu items and configuration.
 */

export type MenuLocation = 'header' | 'footer' | 'sidebar' | 'mobile';
export type MenuVisibility = 'all' | 'desktop' | 'mobile';
export type MenuItemType = 'link' | 'group' | 'mega' | 'separator';
export type MenuTargetType =
    | 'internal_route'
    | 'category'
    | 'tag'
    | 'article'
    | 'author'
    | 'external_url'
    | 'affiliate'
    | 'cookbook';

export interface MenuTarget {
    type: MenuTargetType;
    href: string;
    id?: number;
    slug?: string;
    snapshot?: Record<string, unknown>;
}

export interface MenuImageVariant {
    r2_key: string;
    width: number;
    height: number;
    size_bytes?: number;
}

export interface MenuImageSnapshot {
    media_id?: number;
    alt: string;
    placeholder: string;
    variants: {
        xs: MenuImageVariant;
        sm: MenuImageVariant;
    };
}

export interface MenuColumn {
    id: string;
    title: string;
    items: MenuItem[];
}

export interface MenuFeaturedItem {
    id: string;
    type: 'featured_item';
    label: string;
    description?: string;
    target: MenuTarget;
    image?: MenuImageSnapshot;
    disclosure_label?: string;
}

export interface MenuItem {
    id: string;
    type: MenuItemType;
    label?: string;
    is_enabled: boolean;
    visibility: MenuVisibility;
    highlight: boolean;
    open_in_new_tab?: boolean;
    target?: MenuTarget;
    overview_target?: MenuTarget;
    layout?: 'columns' | 'columns_with_featured_carousel' | 'featured_left';
    items?: MenuItem[];
    columns?: MenuColumn[];
    featured_items?: MenuFeaturedItem[];
    image?: MenuImageSnapshot;
    disclosure_label?: string;
}

export interface MenuDocument {
    location: MenuLocation;
    is_enabled: boolean;
    fallback_to: 'header' | null;
    items: MenuItem[];
}

/**
 * Complete menu configuration
 */
export interface MenuConfig {
    id: number;
    key: string;
    label: string;
    items: MenuItem[];
    isEnabled: boolean;
    location: MenuLocation;
    document: MenuDocument;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Input for creating a new menu
 */
export interface CreateMenuInput {
    key: string;
    label: string;
    items?: MenuItem[];
    location?: MenuLocation;
    description?: string;
}

/**
 * Input for updating a menu
 */
export interface UpdateMenuInput {
    label?: string;
    items?: MenuItem[];
    isEnabled?: boolean;
    location?: MenuLocation;
    fallbackTo?: 'header' | null;
    description?: string;
}

/**
 * API response for menu operations
 */
export interface MenuResponse {
    success: boolean;
    menu?: MenuConfig;
    menus?: MenuConfig[];
    error?: string;
}
