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
        props: { items: [{ slug: 'a' }, { externalUrl: 'https://x.test' }] },
      },
    ]);
    expect(internal.source_type).toBe('internal_recipe');
    expect(external.source_type).toBe('external_recipe');
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
