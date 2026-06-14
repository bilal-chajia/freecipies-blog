import { describe, it, expect } from 'vitest';
import { ImagesJsonInputSchema } from '../images-json.schema';

const parse = (v: unknown) => ImagesJsonInputSchema.safeParse(v);

describe('ImagesJsonInputSchema', () => {
  it('returns undefined for blank/empty payloads', () => {
    expect(parse('').data).toBeUndefined();
    expect(parse(null).data).toBeUndefined();
    expect(parse(undefined).data).toBeUndefined();
  });

  it('accepts an empty object and a slot map (object + array values)', () => {
    expect(parse({}).success).toBe(true);
    const map = {
      hero: { variants: { md: { r2_key: 'media/x.webp', url: 'https://x/y' } }, alt: 'a' },
      content_images: [{ id: 1 }],
    };
    expect(parse(map).success).toBe(true);
  });

  it('accepts a JSON string of a slot map', () => {
    expect(parse(JSON.stringify({ hero: { alt: 'a' } })).success).toBe(true);
  });

  it('rejects malformed JSON', () => {
    expect(parse('{nope').success).toBe(false);
  });

  it('rejects a non-object root (array or scalar)', () => {
    expect(parse([]).success).toBe(false);
    expect(parse(7).success).toBe(false);
  });
});
