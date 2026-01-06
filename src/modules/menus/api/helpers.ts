/**
 * Menus Module - API Helpers
 * ===========================
 * Helper functions for API endpoints.
 */

import type { MenuItem, MenuConfig } from '../types/menus.types';

/**
 * Validate menu item structure
 */
export function validateMenuItem(item: any): item is MenuItem {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.id !== 'string' || !item.id) return false;
    if (typeof item.label !== 'string' || !item.label) return false;
    if (item.type !== 'mega' && item.type !== 'link') return false;

    // For link type, url is required
    if (item.type === 'link' && typeof item.url !== 'string') return false;

    // For mega type, validate columns if present
    if (item.type === 'mega' && item.columns) {
        if (!Array.isArray(item.columns)) return false;
        for (const col of item.columns) {
            if (!validateMenuColumn(col)) return false;
        }
    }

    return true;
}

/**
 * Validate menu column structure
 */
export function validateMenuColumn(col: any): boolean {
    if (!col || typeof col !== 'object') return false;
    if (typeof col.id !== 'string' || !col.id) return false;
    if (typeof col.title !== 'string') return false;
    if (!Array.isArray(col.links)) return false;

    for (const link of col.links) {
        if (!validateMenuLink(link)) return false;
    }

    return true;
}

/**
 * Validate menu link structure
 */
export function validateMenuLink(link: any): boolean {
    if (!link || typeof link !== 'object') return false;
    if (typeof link.id !== 'string' || !link.id) return false;
    if (typeof link.label !== 'string') return false;
    if (typeof link.url !== 'string') return false;
    return true;
}

/**
 * Validate entire menu items array
 */
export function validateMenuItems(items: any): items is MenuItem[] {
    if (!Array.isArray(items)) return false;
    return items.every(validateMenuItem);
}

/**
 * Transform API request body for menu creation/update
 */
export function transformMenuRequestBody(body: any): {
    items?: MenuItem[];
    label?: string;
    isEnabled?: boolean;
    location?: 'header' | 'footer' | 'sidebar' | 'mobile';
    description?: string;
} {
    const result: any = {};

    if (body.items !== undefined) {
        if (!validateMenuItems(body.items)) {
            const error = new Error('Invalid menu items structure');
            (error as any).code = 'VALIDATION_ERROR';
            throw error;
        }
        result.items = body.items;
    }

    if (body.label !== undefined) {
        if (typeof body.label !== 'string' || !body.label.trim()) {
            const error = new Error('Label must be a non-empty string');
            (error as any).code = 'VALIDATION_ERROR';
            throw error;
        }
        result.label = body.label.trim();
    }

    if (body.isEnabled !== undefined) {
        result.isEnabled = Boolean(body.isEnabled);
    }

    if (body.location !== undefined) {
        const validLocations = ['header', 'footer', 'sidebar', 'mobile'];
        if (!validLocations.includes(body.location)) {
            const error = new Error(`Location must be one of: ${validLocations.join(', ')}`);
            (error as any).code = 'VALIDATION_ERROR';
            throw error;
        }
        result.location = body.location;
    }

    if (body.description !== undefined) {
        result.description = body.description ? String(body.description) : undefined;
    }

    return result;
}

/**
 * Transform menu config for API response
 */
export function transformMenuResponse(menu: MenuConfig): any {
    return {
        id: menu.id,
        key: menu.key,
        label: menu.label,
        items: menu.items,
        isEnabled: menu.isEnabled,
        location: menu.location,
        description: menu.description,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
    };
}
