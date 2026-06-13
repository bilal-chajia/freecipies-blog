import { describe, it, expect } from 'vitest';
import {
  parseRoundup, serializeRoundup, addItem, removeItem, moveItem,
  updateItemField, setShowStats, toggleBadge, type RoundupEditModel,
} from '../roundup-edit';
import { RoundupJsonInputSchema } from '@modules/articles/validation/roundup-json.schema';

const item = (id: number, title: string) => ({
  source_type: 'internal_recipe' as const, article_id: id, slug: `r-${id}`, title,
});

describe('roundup-edit', () => {
  it('parses an empty/blank payload to an empty model', () => {
    expect(parseRoundup('')).toEqual({ items: [] });
    expect(parseRoundup(undefined)).toEqual({ items: [] });
    expect(parseRoundup({ items: [], list_type: 'ItemList' })).toEqual({ items: [] });
  });

  it('parses items + presentation from a roundup_json string', () => {
    const model = parseRoundup(JSON.stringify({
      items: [item(1, 'A')], list_type: 'ItemList',
      group_title: 'Best', show_stats: false, visible_badges: ['rating'],
    }));
    expect(model.items).toHaveLength(1);
    expect(model.group_title).toBe('Best');
    expect(model.show_stats).toBe(false);
    expect(model.visible_badges).toEqual(['rating']);
  });

  it('serializes a model to contract-valid roundup_json with positions', () => {
    const model: RoundupEditModel = { items: [item(1, 'A'), item(2, 'B')] };
    const json = serializeRoundup(model);
    const parsed = JSON.parse(json);
    expect(parsed.list_type).toBe('ItemList');
    expect(parsed.items.map((i: any) => i.position)).toEqual([1, 2]);
    expect(RoundupJsonInputSchema.safeParse(json).success).toBe(true);
  });

  it('addItem appends and is idempotent on article_id', () => {
    const m1 = addItem({ items: [] }, item(1, 'A'));
    const m2 = addItem(m1, item(1, 'A'));
    expect(m2.items).toHaveLength(1);
  });

  it('removeItem drops by article_id', () => {
    const m = removeItem({ items: [item(1, 'A'), item(2, 'B')] }, 1);
    expect(m.items.map((i) => i.article_id)).toEqual([2]);
  });

  it('moveItem reorders within bounds and no-ops out of bounds', () => {
    const base = { items: [item(1, 'A'), item(2, 'B')] };
    expect(moveItem(base, 0, 1).items.map((i) => i.article_id)).toEqual([2, 1]);
    expect(moveItem(base, 0, -1).items.map((i) => i.article_id)).toEqual([1, 2]);
  });

  it('updateItemField edits one field on one item', () => {
    const m = updateItemField({ items: [item(1, 'A')] }, 0, 'note', 'tasty');
    expect((m.items[0] as any).note).toBe('tasty');
  });

  it('setShowStats and toggleBadge update presentation', () => {
    expect(setShowStats({ items: [] }, false).show_stats).toBe(false);
    const toggled = toggleBadge({ items: [], visible_badges: ['rating'] }, 'total_time');
    expect(toggled.visible_badges).toContain('total_time');
  });
});
