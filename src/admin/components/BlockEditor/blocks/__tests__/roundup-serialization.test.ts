import { describe, it, expect } from 'vitest';
import { buildRoundupItems, buildRoundupJson } from '../roundup-serialization';

describe('roundup-serialization', () => {
  it('returns an empty list for no roundup blocks', () => {
    expect(buildRoundupItems([])).toEqual([]);
    expect(buildRoundupJson([])).toBe(
      JSON.stringify({ list_type: 'ItemList', items: [] }, null, 2)
    );
  });

  it('ignores non-roundupList blocks', () => {
    const items = buildRoundupItems([
      { type: 'paragraph', props: { itemsJson: '[{"title":"x"}]' } },
      { type: 'customImage', props: {} },
    ]);
    expect(items).toEqual([]);
  });

  it('parses items from the itemsJson string prop', () => {
    const items = buildRoundupItems([
      { type: 'roundupList', props: { itemsJson: '[{"title":"A"},{"title":"B"}]' } },
    ]);
    expect(items.map((i) => i.title)).toEqual(['A', 'B']);
    expect(items.map((i) => i.position)).toEqual([1, 2]);
  });

  it('falls back to the items array prop when itemsJson is absent', () => {
    const items = buildRoundupItems([
      { type: 'roundupList', props: { items: [{ title: 'A' }] } },
    ]);
    expect(items[0].title).toBe('A');
  });

  it('tolerates malformed itemsJson', () => {
    const items = buildRoundupItems([
      { type: 'roundupList', props: { itemsJson: 'not json' } },
    ]);
    expect(items).toEqual([]);
  });

  it('infers source_type from the presence of an external url', () => {
    const [internal, external] = buildRoundupItems([
      {
        type: 'roundupList',
        props: { items: [{ slug: 'a' }, { external_url: 'https://x.test' }] },
      },
    ]);
    expect(internal.source_type).toBe('internal_recipe');
    expect(external.source_type).toBe('external_recipe');
  });

  it('does not honor legacy camelCase keys (NAMING_CONTRACT: snake_case only)', () => {
    const [item] = buildRoundupItems([
      {
        type: 'roundupList',
        props: { items: [{ externalUrl: 'https://x.test', sourceType: 'external_recipe' }] },
      },
    ]);
    expect(item.source_type).toBe('internal_recipe');
    expect(item.external_url).toBe('');
  });

  it('serializes group title, description and show_stats from the block props', () => {
    const json = JSON.parse(
      buildRoundupJson([
        {
          type: 'roundupList',
          props: { title: 'Summer Salads', description: 'Warm-weather bowls.', showStats: false, itemsJson: '[]' },
        },
      ])
    );
    expect(json.group_title).toBe('Summer Salads');
    expect(json.group_description).toBe('Warm-weather bowls.');
    expect(json.show_stats).toBe(false);
  });

  it('omits blank group title/description and defaults show_stats to true', () => {
    const json = JSON.parse(
      buildRoundupJson([
        { type: 'roundupList', props: { title: '   ', description: '', itemsJson: '[]' } },
      ])
    );
    expect(json.group_title).toBeUndefined();
    expect(json.group_description).toBeUndefined();
    expect(json.show_stats).toBe(true);
  });

  it('emits no presentation fields when there is no roundupList block', () => {
    const json = JSON.parse(buildRoundupJson([{ type: 'paragraph', props: {} }]));
    expect(json).toEqual({ list_type: 'ItemList', items: [] });
  });

  it('serializes the visible_badges selection from the block prop', () => {
    const json = JSON.parse(
      buildRoundupJson([
        {
          type: 'roundupList',
          props: { itemsJson: '[]', visibleBadges: '["total_time","calories","is_vegan"]' },
        },
      ])
    );
    expect(json.visible_badges).toEqual(['total_time', 'calories', 'is_vegan']);
  });

  it('omits visible_badges when the prop is absent or malformed', () => {
    const json = JSON.parse(
      buildRoundupJson([{ type: 'roundupList', props: { itemsJson: '[]', visibleBadges: 'nope' } }])
    );
    expect(json.visible_badges).toBeUndefined();
  });

  it('honors explicit source_type and canonical article_id', () => {
    const [item] = buildRoundupItems([
      {
        type: 'roundupList',
        props: { items: [{ source_type: 'external_recipe', article_id: 42 }] },
      },
    ]);
    expect(item.source_type).toBe('external_recipe');
    expect(item.article_id).toBe(42);
  });

  it('continues numbering positions across multiple roundup blocks', () => {
    const items = buildRoundupItems([
      { type: 'roundupList', props: { items: [{ title: 'A' }] } },
      { type: 'roundupList', props: { items: [{ title: 'B' }, { title: 'C' }] } },
    ]);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
  });
});
