/**
 * Menus Module - Type Definitions
 * ================================
 * TypeScript interfaces for mega menu items and configuration.
 */

/**
 * Single link within a menu column
 */
export interface MenuLink {
    id: string;
    label: string;
    url: string;
    openInNewTab?: boolean;
}

/**
 * Column within a mega menu dropdown
 */
export interface MenuColumn {
    id: string;
    title: string;
    links: MenuLink[];
}

/**
 * Featured content section in mega menu
 */
export interface MenuFeatured {
    enabled: boolean;
    title?: string;
    image?: string;
    url?: string;
    description?: string;
}

/**
 * Individual menu item (can be mega or simple link)
 */
export interface MenuItem {
    id: string;
    label: string;
    type: 'mega' | 'link';
    url?: string;
    openInNewTab?: boolean;
    highlight?: boolean;
    columns?: MenuColumn[];
    featured?: MenuFeatured;
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
    location: 'header' | 'footer' | 'sidebar' | 'mobile';
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
    location?: 'header' | 'footer' | 'sidebar' | 'mobile';
    description?: string;
}

/**
 * Input for updating a menu
 */
export interface UpdateMenuInput {
    label?: string;
    items?: MenuItem[];
    isEnabled?: boolean;
    location?: 'header' | 'footer' | 'sidebar' | 'mobile';
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
