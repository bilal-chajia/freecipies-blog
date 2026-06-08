import { describe, it, expect } from 'vitest';
import { toCanonicalEquipmentImage } from '../../../../scripts/migrate-equipment-image.mts';

describe('toCanonicalEquipmentImage', () => {
  it('converts {url, variants:{md,sm:{url}}} to source: external', () => {
    const legacy = {
      url: 'https://m.media-amazon.com/x.jpg',
      variants: { md: { url: 'https://m.media-amazon.com/x.jpg' }, sm: { url: 'https://m.media-amazon.com/x.jpg' } },
    };
    expect(toCanonicalEquipmentImage(legacy)).toEqual({
      source: 'external',
      url: 'https://m.media-amazon.com/x.jpg',
    });
  });

  it('converts {url, alt, width, height} to source: external preserving alt/dims', () => {
    expect(toCanonicalEquipmentImage({ url: 'https://u/x.jpg', alt: 'Pot', width: 800, height: 600 })).toEqual({
      source: 'external', url: 'https://u/x.jpg', alt: 'Pot', width: 800, height: 600,
    });
  });

  it('promotes an r2_key variant snapshot to source: media', () => {
    const out = toCanonicalEquipmentImage({ media_id: 5, variants: { sm: { r2_key: 'media/x-sm.webp', width: 1, height: 1 } } });
    expect(out.source).toBe('media');
    expect(out.media_id).toBe(5);
  });

  it('is idempotent on already-canonical shapes', () => {
    const ext = { source: 'external', url: 'https://u/x.jpg', alt: 'a' };
    expect(toCanonicalEquipmentImage(ext)).toEqual(ext);
  });

  it('returns {} for empty/no-url input', () => {
    expect(toCanonicalEquipmentImage({})).toEqual({});
    expect(toCanonicalEquipmentImage(null)).toEqual({});
  });
});
