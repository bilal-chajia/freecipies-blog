import { describe, it, expect } from 'vitest';
import { FaqsJsonInputSchema } from '../faqs-json.schema';

const parse = (v: unknown) => FaqsJsonInputSchema.safeParse(v);

describe('FaqsJsonInputSchema', () => {
  it('returns undefined for blank/empty payloads', () => {
    expect(parse('').data).toBeUndefined();
    expect(parse('   ').data).toBeUndefined();
    expect(parse(null).data).toBeUndefined();
    expect(parse(undefined).data).toBeUndefined();
  });

  it('accepts the canonical document shape', () => {
    const doc = { heading: 'FAQ', intro: null, items: [{ question: 'Q', answer: 'A' }] };
    const r = parse(doc);
    expect(r.success).toBe(true);
    expect((r.data as any).items).toHaveLength(1);
  });

  it('accepts a JSON string and a legacy bare array of items', () => {
    expect(parse(JSON.stringify({ items: [{ question: 'Q', answer: 'A' }] })).success).toBe(true);
    const legacy = parse([{ question: 'Q', answer: 'A' }]);
    expect(legacy.success).toBe(true);
    expect((legacy.data as any).items).toHaveLength(1);
  });

  it('accepts an incomplete draft (empty items, missing answers)', () => {
    expect(parse({ items: [] }).success).toBe(true);
    expect(parse({ items: [{ question: 'Q' }] }).success).toBe(true);
  });

  it('rejects malformed JSON string', () => {
    expect(parse('{not json').success).toBe(false);
  });

  it('rejects structurally broken payloads', () => {
    expect(parse(42).success).toBe(false);              // scalar root
    expect(parse({ items: 'nope' }).success).toBe(false); // items not array
    expect(parse({ items: ['x'] }).success).toBe(false);  // item not an object
  });
});
