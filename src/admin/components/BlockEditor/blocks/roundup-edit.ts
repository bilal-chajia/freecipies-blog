/**
 * Pure model + edit helpers for roundup_json, used by RoundupListSettings.
 *
 * roundup_json is the single source of truth (recipe pattern). These functions
 * parse it into an editable model, apply one edit, and serialize back to a
 * contract-valid roundup_json string. No React, no block props — unit-testable.
 */
import type { RoundupItemRecipeSnapshot } from '@modules/articles/types/roundups.types';

export type RoundupEditItem = {
  source_type: 'internal_recipe' | 'external_recipe';
  article_id?: string | number;
  slug?: string;
  external_url?: string;
  title: string;
  subtitle?: string;
  description?: string;
  note?: string;
  image?: unknown;
  recipe?: RoundupItemRecipeSnapshot | null;
  rating?: Record<string, unknown> | null;
  author?: Record<string, unknown> | null;
  category?: Record<string, unknown> | null;
  tags?: unknown[];
};

export interface RoundupEditModel {
  items: RoundupEditItem[];
  group_title?: string;
  group_description?: string;
  show_stats?: boolean;
  visible_badges?: string[];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function parseRoundup(value: unknown): RoundupEditModel {
  const obj = asObject(value);
  const items = Array.isArray(obj.items) ? (obj.items as RoundupEditItem[]) : [];
  const model: RoundupEditModel = { items };
  if (typeof obj.group_title === 'string' && obj.group_title.trim()) model.group_title = obj.group_title;
  if (typeof obj.group_description === 'string' && obj.group_description.trim()) model.group_description = obj.group_description;
  if (typeof obj.show_stats === 'boolean') model.show_stats = obj.show_stats;
  if (Array.isArray(obj.visible_badges)) {
    model.visible_badges = obj.visible_badges.filter((k): k is string => typeof k === 'string');
  }
  return model;
}

export function serializeRoundup(model: RoundupEditModel): string {
  const payload: Record<string, unknown> = {
    list_type: 'ItemList',
    items: model.items.map((it, index) => ({ ...it, position: index + 1 })),
  };
  // Store raw (untrimmed): serialize runs on every keystroke, so trimming here
  // would strip a space the instant it is typed. trim() gates inclusion only;
  // the server normalizer trims for storage at save time.
  if (model.group_title && model.group_title.trim()) payload.group_title = model.group_title;
  if (model.group_description && model.group_description.trim()) payload.group_description = model.group_description;
  if (typeof model.show_stats === 'boolean') payload.show_stats = model.show_stats;
  if (model.visible_badges && model.visible_badges.length) payload.visible_badges = model.visible_badges;
  return JSON.stringify(payload, null, 2);
}

export function addItem(model: RoundupEditModel, next: RoundupEditItem): RoundupEditModel {
  if (next.article_id != null && model.items.some((i) => i.article_id === next.article_id)) return model;
  return { ...model, items: [...model.items, next] };
}

export function removeItem(model: RoundupEditModel, articleId: string | number): RoundupEditModel {
  return { ...model, items: model.items.filter((i) => i.article_id !== articleId) };
}

export function moveItem(model: RoundupEditModel, index: number, direction: -1 | 1): RoundupEditModel {
  const target = index + direction;
  if (target < 0 || target >= model.items.length) return model;
  const items = [...model.items];
  const [moved] = items.splice(index, 1);
  items.splice(target, 0, moved);
  return { ...model, items };
}

export function updateItemField(
  model: RoundupEditModel,
  index: number,
  field: 'title' | 'subtitle' | 'note',
  value: string,
): RoundupEditModel {
  if (index < 0 || index >= model.items.length) return model;
  const items = [...model.items];
  items[index] = { ...items[index], [field]: value };
  return { ...model, items };
}

export function clearItems(model: RoundupEditModel): RoundupEditModel {
  return { ...model, items: [] };
}

export function setGroupTitle(model: RoundupEditModel, value: string): RoundupEditModel {
  return { ...model, group_title: value };
}

export function setGroupDescription(model: RoundupEditModel, value: string): RoundupEditModel {
  return { ...model, group_description: value };
}

export function setShowStats(model: RoundupEditModel, value: boolean): RoundupEditModel {
  return { ...model, show_stats: value };
}

export function toggleBadge(model: RoundupEditModel, key: string): RoundupEditModel {
  const current = model.visible_badges ?? [];
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  return { ...model, visible_badges: next };
}
