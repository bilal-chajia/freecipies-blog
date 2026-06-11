/**
 * Roundup badge catalog — single source of truth for the badges a roundup card
 * can display. Both the admin badge picker (RoundupListSettings) and the public
 * renderer (RoundupItemList.astro) derive from this list, so adding a badge here
 * makes it available in both places at once.
 *
 * Pure domain module: no UI or Cloudflare imports. Icons are stored as inner SVG
 * markup (paths/shapes) so each surface can drop them into its own <svg> wrapper.
 */
import type { RoundupItem } from '../types/roundups.types';

export type RoundupBadgeGroup = 'value' | 'nutrition' | 'classification' | 'diet';

export interface RoundupBadgeDef {
  /** Stable key persisted in roundup_json.visible_badges. */
  key: string;
  /** Picker label (admin). */
  label: string;
  /** Picker grouping. */
  group: RoundupBadgeGroup;
  /** Inner SVG markup (24x24, stroke=currentColor) for the site chip. */
  icon: string;
  /** Resolve the display text for an item, or null when the data is absent. */
  resolve: (item: RoundupItem) => string | null;
}

export const ROUNDUP_BADGE_GROUP_LABELS: Record<RoundupBadgeGroup, string> = {
  value: 'Recipe basics',
  nutrition: 'Nutrition',
  classification: 'Classification',
  diet: 'Diet & quality',
};

const ICON = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.5 14a9 9 0 1 1 17 0"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5"/><path d="M21 20a6 6 0 0 0-5-5.9"/>',
  star: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>',
  flame: '<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 1 2 2 2 0-3-1-4-2-6z"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-12h-6z"/>',
  bread: '<path d="M5 11a3 3 0 0 1 0-6h11a3 3 0 0 1 0 6v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/>',
  droplet: '<path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z"/>',
  tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18-3-3-3-15 0-18z"/>',
  pot: '<path d="M5 9h14v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h3"/>',
  leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19c4-4 7-7 9-9"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
} as const;

const recipeOf = (item: RoundupItem) => item.recipe ?? null;
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/** A diet/quality flag is shown only when the snapshot marks it true. */
function flag(key: string, label: string, icon: string): RoundupBadgeDef {
  return {
    key,
    label,
    group: 'diet',
    icon,
    resolve: (item) => (recipeOf(item)?.badges?.[key] ? label : null),
  };
}

export const ROUNDUP_BADGES: RoundupBadgeDef[] = [
  // ── Recipe basics ──────────────────────────────────────────────
  {
    key: 'total_time',
    label: 'Total time',
    group: 'value',
    icon: ICON.clock,
    resolve: (item) => {
      const v = num(recipeOf(item)?.total_time_minutes);
      return v ? `${v} min` : null;
    },
  },
  {
    key: 'prep_time',
    label: 'Prep time',
    group: 'value',
    icon: ICON.clock,
    resolve: (item) => {
      const v = num(recipeOf(item)?.prep_time_minutes);
      return v ? `Prep ${v}m` : null;
    },
  },
  {
    key: 'cook_time',
    label: 'Cook time',
    group: 'value',
    icon: ICON.clock,
    resolve: (item) => {
      const v = num(recipeOf(item)?.cook_time_minutes);
      return v ? `Cook ${v}m` : null;
    },
  },
  {
    key: 'servings',
    label: 'Servings',
    group: 'value',
    icon: ICON.users,
    resolve: (item) => {
      const v = recipeOf(item)?.servings;
      const n = num(v);
      if (n) return `${n} serv.`;
      const s = str(v);
      return s ? s : null;
    },
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    group: 'value',
    icon: ICON.gauge,
    resolve: (item) => {
      const v = str(recipeOf(item)?.difficulty);
      return v ? capitalize(v) : null;
    },
  },
  {
    key: 'rating',
    label: 'Rating',
    group: 'value',
    icon: ICON.star,
    resolve: (item) => {
      const v = num(item.rating?.rating_value);
      return v ? `${v}` : null;
    },
  },

  // ── Nutrition ──────────────────────────────────────────────────
  {
    key: 'calories',
    label: 'Calories',
    group: 'nutrition',
    icon: ICON.flame,
    resolve: (item) => {
      const v = num(recipeOf(item)?.calories_per_serving);
      return v ? `${v} cal` : null;
    },
  },
  {
    key: 'protein',
    label: 'Protein',
    group: 'nutrition',
    icon: ICON.bolt,
    resolve: (item) => {
      const v = num(recipeOf(item)?.protein_g);
      return v ? `${v}g protein` : null;
    },
  },
  {
    key: 'carbs',
    label: 'Carbs',
    group: 'nutrition',
    icon: ICON.bread,
    resolve: (item) => {
      const v = num(recipeOf(item)?.carbohydrate_g);
      return v ? `${v}g carbs` : null;
    },
  },
  {
    key: 'fat',
    label: 'Fat',
    group: 'nutrition',
    icon: ICON.droplet,
    resolve: (item) => {
      const v = num(recipeOf(item)?.fat_g);
      return v ? `${v}g fat` : null;
    },
  },

  // ── Classification ─────────────────────────────────────────────
  {
    key: 'category',
    label: 'Category',
    group: 'classification',
    icon: ICON.tag,
    resolve: (item) => str(recipeOf(item)?.recipe_category),
  },
  {
    key: 'cuisine',
    label: 'Cuisine',
    group: 'classification',
    icon: ICON.globe,
    resolve: (item) => str(recipeOf(item)?.recipe_cuisine),
  },
  {
    key: 'cooking_method',
    label: 'Cooking method',
    group: 'classification',
    icon: ICON.pot,
    resolve: (item) => str(recipeOf(item)?.cooking_method),
  },
  {
    key: 'cost',
    label: 'Estimated cost',
    group: 'classification',
    icon: ICON.wallet,
    resolve: (item) => str(recipeOf(item)?.estimated_cost),
  },

  // ── Diet & quality (boolean flags) ─────────────────────────────
  flag('is_vegetarian', 'Vegetarian', ICON.leaf),
  flag('is_vegan', 'Vegan', ICON.leaf),
  flag('is_gluten_free', 'Gluten-free', ICON.check),
  flag('is_dairy_free', 'Dairy-free', ICON.check),
  flag('is_healthy', 'Healthy', ICON.leaf),
  flag('is_high_protein', 'High protein', ICON.bolt),
  flag('is_quick', 'Quick', ICON.clock),
  flag('is_budget', 'Budget', ICON.wallet),
  flag('is_low_calorie', 'Low calorie', ICON.flame),
];

/** Default badge selection (matches the pre-picker behaviour). */
export const DEFAULT_ROUNDUP_BADGES: string[] = ['total_time', 'difficulty', 'rating'];

const BADGE_BY_KEY: Record<string, RoundupBadgeDef> = Object.fromEntries(
  ROUNDUP_BADGES.map((b) => [b.key, b])
);

export function getRoundupBadge(key: string): RoundupBadgeDef | undefined {
  return BADGE_BY_KEY[key];
}

/** Resolve the ordered, data-backed badges to render for one item. */
export function resolveRoundupBadges(
  item: RoundupItem,
  visibleKeys: string[] | undefined
): { key: string; text: string; icon: string }[] {
  const keys = visibleKeys && visibleKeys.length ? visibleKeys : DEFAULT_ROUNDUP_BADGES;
  const out: { key: string; text: string; icon: string }[] = [];
  for (const key of keys) {
    const def = BADGE_BY_KEY[key];
    if (!def) continue;
    const text = def.resolve(item);
    if (text) out.push({ key, text, icon: def.icon });
  }
  return out;
}
