import { describe, it, expect } from 'vitest';
import { RoundupJsonInputSchema } from '../roundup-json.schema';

const parse = (input: unknown) => RoundupJsonInputSchema.safeParse(input);

describe('RoundupJsonInputSchema — accepts valid + draft payloads', () => {
  it('accepts a well-formed roundup object', () => {
    const r = parse({
      list_type: 'ItemList',
      items: [
        { position: 1, source_type: 'internal_recipe', article_id: 42, slug: 'x', title: 'X' },
      ],
      group_title: 'Best',
      show_stats: true,
      visible_badges: ['total_time', 'rating'],
    });
    expect(r.success).toBe(true);
  });

  it('accepts a JSON-encoded string payload', () => {
    const r = parse(JSON.stringify({ items: [], list_type: 'ItemList' }));
    expect(r.success).toBe(true);
    expect((r as any).data.items).toEqual([]);
  });

  it('accepts an empty draft (no items yet)', () => {
    expect(parse({ items: [] }).success).toBe(true);
  });

  it('accepts an incomplete draft item (optional fields absent)', () => {
    expect(parse({ items: [{ title: 'Work in progress' }] }).success).toBe(true);
    expect(parse({ items: [{}] }).success).toBe(true);
  });

  it('treats an empty string as no roundup (undefined)', () => {
    const r = parse('');
    expect(r.success).toBe(true);
    expect((r as any).data).toBeUndefined();
  });
});

describe('RoundupJsonInputSchema — rejects structural corruption', () => {
  it('rejects invalid JSON string', () => {
    expect(parse('{ not json').success).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(parse('"a string"').success).toBe(false);
    expect(parse(['array']).success).toBe(false);
  });

  it('rejects items that is not an array', () => {
    expect(parse({ items: 'nope' }).success).toBe(false);
  });

  it('rejects an item that is not an object', () => {
    expect(parse({ items: ['nope'] }).success).toBe(false);
  });

  it('rejects an invalid source_type', () => {
    expect(parse({ items: [{ source_type: 'bogus' }] }).success).toBe(false);
  });

  it('rejects a non-numeric article_id', () => {
    expect(parse({ items: [{ article_id: 'x' }] }).success).toBe(false);
  });

  it('rejects a non-array tags field', () => {
    expect(parse({ items: [{ tags: 'a,b' }] }).success).toBe(false);
  });

  it('rejects a non-boolean show_stats', () => {
    expect(parse({ items: [], show_stats: 'yes' }).success).toBe(false);
  });
});
