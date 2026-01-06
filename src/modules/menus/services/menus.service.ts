/**
 * Menus Module - Database Service
 * =================================
 * Database operations for mega menus using the site_settings table.
 * Uses keys: 'menu_header', 'menu_footer', 'menu_mobile', etc.
 */

import type { D1Database } from '@cloudflare/workers-types';
import { getSettingValue, upsertSetting } from '@modules/settings/services/settings.service';
import type { MenuItem, MenuConfig, CreateMenuInput, UpdateMenuInput } from '../types/menus.types';

// Settings keys for menu storage
const MENU_KEY_PREFIX = 'menu_';
const getMenuKey = (key: string) => `${MENU_KEY_PREFIX}${key}`;

// Default menu items
const DEFAULT_HEADER_MENU: MenuItem[] = [
    {
        id: 'nav-1',
        label: 'Recipes',
        type: 'mega',
        columns: [
            {
                id: 'col-1',
                title: 'By Course',
                links: [
                    { id: 'link-1', label: 'Breakfast', url: '/recipes?course=breakfast' },
                    { id: 'link-2', label: 'Lunch', url: '/recipes?course=lunch' },
                    { id: 'link-3', label: 'Dinner', url: '/recipes?course=dinner' },
                    { id: 'link-4', label: 'Desserts', url: '/recipes?course=desserts' },
                ]
            },
            {
                id: 'col-2',
                title: 'By Diet',
                links: [
                    { id: 'link-5', label: 'Vegetarian', url: '/recipes?diet=vegetarian' },
                    { id: 'link-6', label: 'Vegan', url: '/recipes?diet=vegan' },
                    { id: 'link-7', label: 'Gluten-Free', url: '/recipes?diet=gluten-free' },
                ]
            },
        ],
    },
    { id: 'nav-2', label: 'Categories', type: 'link', url: '/categories' },
    { id: 'nav-3', label: 'Authors', type: 'link', url: '/authors' },
    { id: 'nav-4', label: 'About', type: 'link', url: '/about' },
];

const DEFAULT_FOOTER_MENU: MenuItem[] = [
    { id: 'footer-1', label: 'Privacy Policy', type: 'link', url: '/privacy' },
    { id: 'footer-2', label: 'Terms of Service', type: 'link', url: '/terms' },
    { id: 'footer-3', label: 'Contact', type: 'link', url: '/contact' },
];

/**
 * Get default menu by key
 */
function getDefaultMenu(key: string): MenuItem[] {
    switch (key) {
        case 'header': return DEFAULT_HEADER_MENU;
        case 'footer': return DEFAULT_FOOTER_MENU;
        default: return [];
    }
}

/**
 * Get menu items by key (convenience function for frontend)
 * Returns default menu items if not found in database
 */
export async function getMenuItems(db: D1Database, key: string): Promise<MenuItem[]> {
    try {
        const storedMenu = await getSettingValue<MenuItem[]>(db, getMenuKey(key));
        if (storedMenu && Array.isArray(storedMenu) && storedMenu.length > 0) {
            return storedMenu;
        }
    } catch (error) {
        console.error(`Failed to load menu '${key}':`, error);
    }

    // Return defaults
    return getDefaultMenu(key);
}

/**
 * Get a menu config object by key
 */
export async function getMenuByKey(db: D1Database, key: string): Promise<MenuConfig | null> {
    try {
        const items = await getMenuItems(db, key);

        return {
            id: 0, // Not applicable when using settings table
            key,
            label: `${key.charAt(0).toUpperCase() + key.slice(1)} Menu`,
            items,
            isEnabled: true,
            location: key as MenuConfig['location'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    } catch {
        return null;
    }
}

/**
 * Save menu items by key
 */
export async function saveMenuItems(
    db: D1Database,
    key: string,
    items: MenuItem[]
): Promise<boolean> {
    try {
        await upsertSetting(db, getMenuKey(key), items, {
            description: `${key.charAt(0).toUpperCase() + key.slice(1)} navigation menu configuration`,
            category: 'menus',
            type: 'json',
        });
        return true;
    } catch (error) {
        console.error(`Failed to save menu '${key}':`, error);
        return false;
    }
}

/**
 * Update a menu by key (alias for saveMenuItems)
 */
export async function updateMenuByKey(
    db: D1Database,
    key: string,
    input: UpdateMenuInput
): Promise<MenuConfig | null> {
    if (input.items) {
        const success = await saveMenuItems(db, key, input.items);
        if (!success) return null;
    }

    return getMenuByKey(db, key);
}

/**
 * Upsert a menu (create or update)
 */
export async function upsertMenu(
    db: D1Database,
    key: string,
    input: UpdateMenuInput & { label?: string }
): Promise<MenuConfig | null> {
    if (input.items) {
        const success = await saveMenuItems(db, key, input.items);
        if (!success) return null;
    }

    return getMenuByKey(db, key);
}

/**
 * Get all menus
 */
export async function getMenus(db: D1Database): Promise<MenuConfig[]> {
    const menuKeys = ['header', 'footer', 'mobile', 'sidebar'];
    const menus: MenuConfig[] = [];

    for (const key of menuKeys) {
        const menu = await getMenuByKey(db, key);
        if (menu && menu.items.length > 0) {
            menus.push(menu);
        }
    }

    return menus;
}

/**
 * Delete a menu by key
 */
export async function deleteMenuByKey(db: D1Database, key: string): Promise<boolean> {
    try {
        await upsertSetting(db, getMenuKey(key), [], {
            description: `${key.charAt(0).toUpperCase() + key.slice(1)} navigation menu configuration (deleted)`,
            category: 'menus',
            type: 'json',
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Create a new menu (just saves items)
 */
export async function createMenu(
    db: D1Database,
    input: CreateMenuInput
): Promise<MenuConfig | null> {
    const success = await saveMenuItems(db, input.key, input.items || []);
    if (!success) return null;

    return getMenuByKey(db, input.key);
}

/**
 * Get menus by location (for compatibility)
 */
export async function getMenusByLocation(
    db: D1Database,
    location: 'header' | 'footer' | 'sidebar' | 'mobile'
): Promise<MenuConfig[]> {
    const menu = await getMenuByKey(db, location);
    return menu ? [menu] : [];
}

/**
 * Seed default menus (no-op since defaults are returned automatically)
 */
export async function seedDefaultMenus(_db: D1Database): Promise<void> {
    // Defaults are returned automatically by getMenuItems if nothing is stored
}
