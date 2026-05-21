/**
 * Menus Module - Database Service
 * =================================
 * Stores canonical menu documents in site_settings under menu_* keys.
 */

import type { D1Database } from '@cloudflare/workers-types';
import {
    getSettingValue,
    invalidateSettingCache,
    upsertSetting,
} from '@modules/settings/services/settings.service';
import type { SettingsCacheStore } from '@modules/settings/services/settings.service';
import type {
    CreateMenuInput,
    MenuConfig,
    MenuDocument,
    MenuItem,
    MenuLocation,
    MenuTarget,
    UpdateMenuInput,
} from '../types/menus.types';

interface MenuServiceOptions {
    cache?: SettingsCacheStore | null;
}

const MENU_KEY_PREFIX = 'menu_';
const MENU_LOCATIONS: MenuLocation[] = ['header', 'footer', 'mobile', 'sidebar'];

const getMenuKey = (key: string) => key.startsWith(MENU_KEY_PREFIX) ? key : `${MENU_KEY_PREFIX}${key}`;
const getMenuLocation = (key: string): MenuLocation => {
    const location = key.replace(/^menu_/, '');
    return MENU_LOCATIONS.includes(location as MenuLocation) ? location as MenuLocation : 'header';
};

const routeTarget = (href: string): MenuTarget => ({
    type: href.startsWith('http') ? 'external_url' : 'internal_route',
    href,
});

const DEFAULT_HEADER_ITEMS: MenuItem[] = [
    {
        id: 'nav-recipes',
        type: 'link',
        label: 'Recipes',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/recipes'),
    },
    {
        id: 'nav-categories',
        type: 'link',
        label: 'Categories',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/categories'),
    },
    {
        id: 'nav-authors',
        type: 'link',
        label: 'Authors',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/authors'),
    },
    {
        id: 'nav-about',
        type: 'link',
        label: 'About',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/about'),
    },
];

const DEFAULT_FOOTER_ITEMS: MenuItem[] = [
    {
        id: 'footer-privacy',
        type: 'link',
        label: 'Privacy Policy',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/privacy'),
    },
    {
        id: 'footer-terms',
        type: 'link',
        label: 'Terms of Service',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/terms'),
    },
    {
        id: 'footer-contact',
        type: 'link',
        label: 'Contact',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: routeTarget('/contact'),
    },
];

const getDefaultDocument = (location: MenuLocation): MenuDocument => ({
    location,
    is_enabled: true,
    fallback_to: location === 'mobile' ? 'header' : null,
    items: location === 'header'
        ? DEFAULT_HEADER_ITEMS
        : location === 'footer'
            ? DEFAULT_FOOTER_ITEMS
            : [],
});

const normalizeTarget = (value: unknown, fallbackUrl?: unknown): MenuTarget | undefined => {
    if (value && typeof value === 'object') {
        const target = value as Record<string, unknown>;
        const type = typeof target.type === 'string' ? target.type : undefined;
        const href = typeof target.href === 'string'
            ? target.href
            : typeof fallbackUrl === 'string'
                ? fallbackUrl
                : undefined;
        if (!type || !href) return href ? routeTarget(href) : undefined;
        return {
            type: type as MenuTarget['type'],
            href,
            ...(typeof target.id === 'number' ? { id: target.id } : {}),
            ...(typeof target.slug === 'string' ? { slug: target.slug } : {}),
            ...(target.snapshot && typeof target.snapshot === 'object' ? { snapshot: target.snapshot as Record<string, unknown> } : {}),
        };
    }

    return typeof fallbackUrl === 'string' ? routeTarget(fallbackUrl) : undefined;
};

const normalizeMenuImage = (value: unknown) => {
    if (!value || typeof value !== 'object') return undefined;
    const image = value as Record<string, any>;
    const variants = image.variants && typeof image.variants === 'object' ? image.variants : {};
    const xs = variants.xs;
    const sm = variants.sm;
    if (!xs?.r2_key || !sm?.r2_key) return undefined;
    return {
        ...(typeof image.media_id === 'number' ? { media_id: image.media_id } : {}),
        alt: typeof image.alt === 'string' ? image.alt : '',
        placeholder: typeof image.placeholder === 'string' ? image.placeholder : '',
        variants: {
            xs: {
                r2_key: xs.r2_key,
                width: Number(xs.width) || 0,
                height: Number(xs.height) || 0,
                ...(Number.isFinite(Number(xs.size_bytes)) ? { size_bytes: Number(xs.size_bytes) } : {}),
            },
            sm: {
                r2_key: sm.r2_key,
                width: Number(sm.width) || 0,
                height: Number(sm.height) || 0,
                ...(Number.isFinite(Number(sm.size_bytes)) ? { size_bytes: Number(sm.size_bytes) } : {}),
            },
        },
    };
};

const normalizeMenuItem = (value: unknown, location: MenuLocation): MenuItem | null => {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, any>;
    const id = typeof item.id === 'string' && item.id.trim() ? item.id : `menu-${crypto.randomUUID()}`;
    const type = ['link', 'group', 'mega', 'separator'].includes(item.type) ? item.type : 'link';
    const target = normalizeTarget(item.target, item.url);

    const normalized: MenuItem = {
        id,
        type,
        ...(typeof item.label === 'string' ? { label: item.label } : {}),
        is_enabled: item.is_enabled !== undefined ? Boolean(item.is_enabled) : true,
        visibility: ['all', 'desktop', 'mobile'].includes(item.visibility) ? item.visibility : 'all',
        highlight: Boolean(item.highlight),
    };

    if (target && type !== 'separator' && type !== 'group' && type !== 'mega') {
        normalized.target = target;
    }
    if ((type === 'link' || type === 'mega') && item.open_in_new_tab !== undefined) {
        normalized.open_in_new_tab = Boolean(item.open_in_new_tab);
    } else if ((type === 'link' || type === 'mega') && item.openInNewTab !== undefined) {
        normalized.open_in_new_tab = Boolean(item.openInNewTab);
    }

    if (type === 'group') {
        const children = Array.isArray(item.items) ? item.items : Array.isArray(item.children) ? item.children : [];
        normalized.items = children
            .map((child) => normalizeMenuItem(child, location))
            .filter((child): child is MenuItem => Boolean(child));
    }

    if (type === 'mega') {
        normalized.overview_target = normalizeTarget(item.overview_target, item.url);
        normalized.layout = ['columns', 'columns_with_featured_carousel', 'featured_left'].includes(item.layout)
            ? item.layout
            : item.featured?.enabled
                ? 'featured_left'
                : 'columns';
        normalized.columns = (Array.isArray(item.columns) ? item.columns : [])
            .map((column: Record<string, any>) => ({
                id: typeof column.id === 'string' ? column.id : `column-${crypto.randomUUID()}`,
                title: typeof column.title === 'string' ? column.title : '',
                items: (Array.isArray(column.items) ? column.items : Array.isArray(column.links) ? column.links : [])
                    .map((link: unknown) => normalizeMenuItem({
                        ...(link && typeof link === 'object' ? link as Record<string, unknown> : {}),
                        type: 'link',
                    }, location))
                    .filter((link): link is MenuItem => Boolean(link)),
            }));

        const legacyFeatured = item.featured?.enabled
            ? [{
                id: `${id}-featured`,
                type: 'featured_item',
                label: item.featured.title || 'Featured',
                description: item.featured.description,
                target: routeTarget(item.featured.url || '#'),
            }]
            : [];
        const featuredItems = Array.isArray(item.featured_items) ? item.featured_items : legacyFeatured;
        normalized.featured_items = featuredItems
            .map((featured: Record<string, any>) => {
                const featuredTarget = normalizeTarget(featured.target, featured.url);
                if (!featuredTarget) return null;
                return {
                    id: typeof featured.id === 'string' ? featured.id : `featured-${crypto.randomUUID()}`,
                    type: 'featured_item' as const,
                    label: String(featured.label || featured.title || 'Featured'),
                    ...(featured.description ? { description: String(featured.description) } : {}),
                    target: featuredTarget,
                    ...(normalizeMenuImage(featured.image) ? { image: normalizeMenuImage(featured.image) } : {}),
                    ...(featured.disclosure_label ? { disclosure_label: String(featured.disclosure_label) } : {}),
                };
            })
            .filter((featured): featured is NonNullable<typeof featured> => Boolean(featured));
    }

    if (location === 'header') {
        const image = normalizeMenuImage(item.image);
        if (image) normalized.image = image;
    }

    if (target && type === 'link') normalized.target = target;
    if (type === 'separator') {
        delete normalized.label;
        delete normalized.target;
        delete normalized.open_in_new_tab;
    }

    return normalized;
};

export function normalizeMenuDocument(value: unknown, location: MenuLocation): MenuDocument {
    if (Array.isArray(value)) {
        return {
            ...getDefaultDocument(location),
            items: value
                .map((item) => normalizeMenuItem(item, location))
                .filter((item): item is MenuItem => Boolean(item)),
        };
    }

    if (!value || typeof value !== 'object') return getDefaultDocument(location);

    const document = value as Record<string, unknown>;
    const normalizedLocation = getMenuLocation(String(document.location || location));
    return {
        location: normalizedLocation,
        is_enabled: document.is_enabled !== undefined ? Boolean(document.is_enabled) : true,
        fallback_to: normalizedLocation === 'mobile' && document.fallback_to === 'header' ? 'header' : null,
        items: (Array.isArray(document.items) ? document.items : [])
            .map((item) => normalizeMenuItem(item, normalizedLocation))
            .filter((item): item is MenuItem => Boolean(item)),
    };
}

const deriveMobileDocument = (header: MenuDocument): MenuDocument => ({
    location: 'mobile',
    is_enabled: true,
    fallback_to: 'header',
    items: header.items
        .filter((item) => item.is_enabled && item.visibility !== 'desktop')
        .map((item) => ({
            ...item,
            visibility: 'mobile' as const,
        })),
});

export async function getMenuDocument(
    db: D1Database,
    key: string,
    options?: MenuServiceOptions,
): Promise<MenuDocument> {
    const location = getMenuLocation(key);
    const stored = await getSettingValue<unknown>(db, getMenuKey(location), options);
    const document = stored ? normalizeMenuDocument(stored, location) : getDefaultDocument(location);

    if (location === 'mobile' && (!document.is_enabled || (document.items.length === 0 && document.fallback_to === 'header'))) {
        return deriveMobileDocument(await getMenuDocument(db, 'header', options));
    }

    return document;
}

export async function getMenuItems(
    db: D1Database,
    key: string,
    options?: MenuServiceOptions,
): Promise<MenuItem[]> {
    return (await getMenuDocument(db, key, options)).items;
}

export async function getMenuByKey(
    db: D1Database,
    key: string,
    options?: MenuServiceOptions,
): Promise<MenuConfig | null> {
    const document = await getMenuDocument(db, key, options);
    const location = getMenuLocation(key);
    return {
        id: 0,
        key: getMenuKey(location),
        label: `${location.charAt(0).toUpperCase() + location.slice(1)} Menu`,
        items: document.items,
        isEnabled: document.is_enabled,
        location,
        document,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

export async function saveMenuDocument(
    db: D1Database,
    key: string,
    document: MenuDocument,
    options?: MenuServiceOptions,
): Promise<boolean> {
    const location = getMenuLocation(key);
    const normalized = normalizeMenuDocument({ ...document, location }, location);
    await upsertSetting(db, getMenuKey(location), normalized, {
        description: `${location.charAt(0).toUpperCase() + location.slice(1)} navigation menu configuration`,
        category: 'menus',
        type: 'json',
        cache: options?.cache,
    });

    if (location === 'header') {
        await invalidateSettingCache(options?.cache, getMenuKey('mobile'));
    }

    return true;
}

export async function saveMenuItems(
    db: D1Database,
    key: string,
    items: MenuItem[],
    options?: MenuServiceOptions,
): Promise<boolean> {
    const location = getMenuLocation(key);
    return saveMenuDocument(db, location, {
        ...getDefaultDocument(location),
        items,
    }, options);
}

export async function updateMenuByKey(
    db: D1Database,
    key: string,
    input: UpdateMenuInput,
    options?: MenuServiceOptions,
): Promise<MenuConfig | null> {
    const current = await getMenuDocument(db, key, options);
    const document: MenuDocument = {
        ...current,
        is_enabled: input.isEnabled ?? current.is_enabled,
        fallback_to: input.fallbackTo ?? current.fallback_to,
        items: input.items ?? current.items,
    };
    await saveMenuDocument(db, key, document, options);
    return getMenuByKey(db, key, options);
}

export async function upsertMenu(
    db: D1Database,
    key: string,
    input: UpdateMenuInput & { label?: string },
    options?: MenuServiceOptions,
): Promise<MenuConfig | null> {
    return updateMenuByKey(db, key, input, options);
}

export async function getMenus(db: D1Database, options?: MenuServiceOptions): Promise<MenuConfig[]> {
    const menus: MenuConfig[] = [];
    for (const key of MENU_LOCATIONS) {
        const menu = await getMenuByKey(db, key, options);
        if (menu) menus.push(menu);
    }
    return menus;
}

export async function deleteMenuByKey(
    db: D1Database,
    key: string,
    options?: MenuServiceOptions,
): Promise<boolean> {
    const location = getMenuLocation(key);
    return saveMenuDocument(db, location, {
        location,
        is_enabled: false,
        fallback_to: location === 'mobile' ? 'header' : null,
        items: [],
    }, options);
}

export async function createMenu(
    db: D1Database,
    input: CreateMenuInput,
    options?: MenuServiceOptions,
): Promise<MenuConfig | null> {
    const location = input.location ?? getMenuLocation(input.key);
    await saveMenuDocument(db, location, {
        ...getDefaultDocument(location),
        items: input.items ?? [],
    }, options);
    return getMenuByKey(db, location, options);
}

export async function getMenusByLocation(
    db: D1Database,
    location: MenuLocation,
    options?: MenuServiceOptions,
): Promise<MenuConfig[]> {
    const menu = await getMenuByKey(db, location, options);
    return menu ? [menu] : [];
}

export async function seedDefaultMenus(_db: D1Database): Promise<void> {
    // Defaults are returned automatically by getMenuDocument when no setting exists.
}
