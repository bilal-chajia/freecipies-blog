import type {
  MenuItem,
  MenuItemType,
  MenuVisibility,
  MenuTarget,
  MenuTargetType,
  MenuImageSnapshot,
  MenuImageVariant,
  MenuColumn,
  MenuFeaturedItem
} from "@modules/menus/types/menus.types";
import type { HydratedArticle } from "@modules/articles";

// --- Navigation Presenters ---

const linkItem = (id: string, label: string, href: string): MenuItem => ({
  id,
  label,
  type: "link",
  is_enabled: true,
  visibility: "all",
  highlight: false,
  target: {
    type: "internal_route",
    href,
  },
});

export const DEFAULT_HEADER_MENU: MenuItem[] = [
  linkItem("nav-1", "Categories", "/categories"),
  linkItem("nav-2", "Recipes", "/recipes"),
  linkItem("nav-3", "Bookmarks", "/my-bookmarks"),
  linkItem("nav-4", "Authors", "/authors"),
  linkItem("nav-5", "About", "/about"),
  linkItem("nav-6", "Contact", "/contact"),
];

const VALID_MENU_ITEM_TYPES: MenuItemType[] = ['link', 'group', 'mega', 'separator'];
const VALID_VISIBILITY_VALUES: MenuVisibility[] = ['all', 'desktop', 'mobile'];
const VALID_TARGET_TYPES: MenuTargetType[] = [
  'internal_route', 'category', 'tag', 'article', 'author', 'external_url', 'affiliate', 'cookbook'
];
const VALID_LAYOUTS = ['columns', 'columns_with_featured_carousel', 'featured_left'] as const;

function normalizeMenuTarget(input: unknown): MenuTarget | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const raw = input as Record<string, unknown>;

  const type = typeof raw.type === 'string' && VALID_TARGET_TYPES.includes(raw.type as MenuTargetType)
    ? (raw.type as MenuTargetType)
    : undefined;
  const href = typeof raw.href === 'string' ? raw.href : undefined;

  if (!type || !href) return undefined;

  return {
    type,
    href,
    ...(typeof raw.id === 'number' && Number.isFinite(raw.id) ? { id: raw.id } : {}),
    ...(typeof raw.slug === 'string' ? { slug: raw.slug } : {}),
    ...(typeof raw.snapshot === 'object' && raw.snapshot !== null ? { snapshot: raw.snapshot as Record<string, unknown> } : {}),
  };
}

function normalizeMenuImageVariant(input: unknown): MenuImageVariant | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const raw = input as Record<string, unknown>;

  const r2Key = typeof raw.r2_key === 'string' ? raw.r2_key : (typeof raw.r2Key === 'string' ? raw.r2Key : undefined);
  const width = typeof raw.width === 'number' && Number.isFinite(raw.width) ? raw.width : undefined;
  const height = typeof raw.height === 'number' && Number.isFinite(raw.height) ? raw.height : undefined;

  if (!r2Key || width === undefined || height === undefined) return undefined;

  return {
    r2_key: r2Key,
    width,
    height,
    ...(typeof raw.size_bytes === 'number' && Number.isFinite(raw.size_bytes) ? { size_bytes: raw.size_bytes } : {}),
  };
}

function normalizeMenuImageSnapshot(input: unknown): MenuImageSnapshot | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const raw = input as Record<string, unknown>;

  const alt = typeof raw.alt === 'string' ? raw.alt : '';
  const placeholder = typeof raw.placeholder === 'string' ? raw.placeholder : '';

  const variantsRaw = raw.variants;
  if (typeof variantsRaw !== 'object' || variantsRaw === null) return undefined;
  const vRaw = variantsRaw as Record<string, unknown>;

  const xs = normalizeMenuImageVariant(vRaw.xs);
  const sm = normalizeMenuImageVariant(vRaw.sm);

  if (!xs || !sm) return undefined;

  return {
    alt,
    placeholder,
    variants: { xs, sm },
    ...(typeof raw.media_id === 'number' && Number.isFinite(raw.media_id) ? { media_id: raw.media_id } : {}),
  };
}

function normalizeMenuFeaturedItem(input: unknown): MenuFeaturedItem | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const raw = input as Record<string, unknown>;

  const id = typeof raw.id === 'string' ? raw.id : undefined;
  const type = raw.type === 'featured_item' ? 'featured_item' : undefined;
  const label = typeof raw.label === 'string' ? raw.label : undefined;
  const target = normalizeMenuTarget(raw.target);

  if (!id || !type || !label || !target) return undefined;

  const item: MenuFeaturedItem = {
    id,
    type,
    label,
    target,
  };

  if (typeof raw.description === 'string') item.description = raw.description;
  if (typeof raw.disclosure_label === 'string') item.disclosure_label = raw.disclosure_label;

  const image = normalizeMenuImageSnapshot(raw.image);
  if (image) item.image = image;

  return item;
}

function normalizeMenuColumn(input: unknown): MenuColumn | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const raw = input as Record<string, unknown>;

  const id = typeof raw.id === 'string' ? raw.id : undefined;
  const title = typeof raw.title === 'string' ? raw.title : undefined;

  if (!id || !title) return undefined;

  const items: MenuItem[] = [];
  if (Array.isArray(raw.items)) {
    for (const item of raw.items) {
      const normalized = normalizeMenuItem(item);
      if (normalized) {
        items.push(normalized);
      }
    }
  }

  return { id, title, items };
}

export function normalizeMenuItem(item: unknown): MenuItem | null {
  if (typeof item !== "object" || item === null) return null;
  const raw = item as Record<string, unknown>;

  const id = typeof raw.id === "string" ? raw.id : undefined;
  const type = typeof raw.type === "string" && VALID_MENU_ITEM_TYPES.includes(raw.type as MenuItemType)
    ? (raw.type as MenuItemType)
    : undefined;

  if (!id || !type) return null;

  // Filter out disabled items
  if (raw.is_enabled === false) return null;

  const normalized: MenuItem = {
    id,
    type,
    is_enabled: true,
    visibility: (typeof raw.visibility === "string" && VALID_VISIBILITY_VALUES.includes(raw.visibility as MenuVisibility))
      ? (raw.visibility as MenuVisibility)
      : "all",
    highlight: !!raw.highlight,
    open_in_new_tab: !!raw.open_in_new_tab,
  };

  if (typeof raw.label === "string") normalized.label = raw.label;
  if (typeof raw.disclosure_label === "string") normalized.disclosure_label = raw.disclosure_label;

  const target = normalizeMenuTarget(raw.target);
  if (target) normalized.target = target;

  const overviewTarget = normalizeMenuTarget(raw.overview_target);
  if (overviewTarget) normalized.overview_target = overviewTarget;

  const layout = typeof raw.layout === "string" && VALID_LAYOUTS.includes(raw.layout as any)
    ? (raw.layout as typeof VALID_LAYOUTS[number])
    : undefined;
  if (layout) normalized.layout = layout;

  const image = normalizeMenuImageSnapshot(raw.image);
  if (image) normalized.image = image;

  // Process items (children menu items)
  if (Array.isArray(raw.items)) {
    const items: MenuItem[] = [];
    for (const child of raw.items) {
      const normalizedChild = normalizeMenuItem(child);
      if (normalizedChild) items.push(normalizedChild);
    }
    if (items.length > 0) {
      normalized.items = items;
    }
  }

  // Process columns
  const rawCols = raw.columns;
  if (Array.isArray(rawCols)) {
    const columns: MenuColumn[] = [];
    for (const col of rawCols) {
      const normalizedCol = normalizeMenuColumn(col);
      if (normalizedCol) columns.push(normalizedCol);
    }
    if (columns.length > 0) {
      normalized.columns = columns;
    }
  }

  // Process featured_items
  const rawFeatured = raw.featured_items;
  if (Array.isArray(rawFeatured)) {
    const featuredItems: MenuFeaturedItem[] = [];
    for (const feat of rawFeatured) {
      const normalizedFeat = normalizeMenuFeaturedItem(feat);
      if (normalizedFeat) featuredItems.push(normalizedFeat);
    }
    if (featuredItems.length > 0) {
      normalized.featured_items = featuredItems;
    }
  }

  return normalized;
}

export function presentHeaderMenu(storedMenu: unknown): MenuItem[] {
  if (!Array.isArray(storedMenu)) return DEFAULT_HEADER_MENU;

  const presented: MenuItem[] = [];
  for (const item of storedMenu) {
    const normalized = normalizeMenuItem(item);
    if (normalized) {
      presented.push(normalized);
    }
  }

  return presented.length > 0 ? presented : DEFAULT_HEADER_MENU;
}

// --- Popular Recipes Presenters ---

export function presentPopularRecipes(
  recipes: HydratedArticle[] | undefined,
  currentSlug: string,
  limit: number
): HydratedArticle[] {
  return (recipes || [])
    .filter((recipe) => recipe.slug !== currentSlug)
    .slice(0, limit);
}

