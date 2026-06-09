import { describe, expect, it } from 'vitest';
import { buildFeaturedArticleSnapshot } from '../featured-article';
import type { CachedCardJson } from '../../../articles/types/cache.types';

const baseCard: CachedCardJson = {
  id: 42,
  type: 'recipe',
  slug: 'fluffy-pancakes',
  headline: 'Fluffy Pancakes',
};

describe('buildFeaturedArticleSnapshot', () => {
  it('maps id/slug/headline to id/slug/title', () => {
    const snap = buildFeaturedArticleSnapshot(baseCard);
    expect(snap).toEqual({ id: 42, slug: 'fluffy-pancakes', title: 'Fluffy Pancakes' });
  });

  it('resolves the best image variant to a public url and never exposes r2_key', () => {
    const snap = buildFeaturedArticleSnapshot({
      ...baseCard,
      image: {
        alt: 'Stack of pancakes',
        variants: {
          sm: { r2_key: 'media/p-sm.webp', width: 720, height: 405 },
          lg: { r2_key: 'media/p-lg.webp', width: 2048, height: 1152 },
        },
      },
    });
    expect(snap.image?.alt).toBe('Stack of pancakes');
    expect(snap.image?.width).toBe(2048);
    // url is the public proxy form (/api/images/<key>); the raw r2_key FIELD is absent
    expect(snap.image?.url).toBe('/api/images/media/p-lg.webp');
    expect(JSON.stringify(snap)).not.toContain('r2_key');
  });

  it('omits image when no resolvable variant exists', () => {
    const snap = buildFeaturedArticleSnapshot({ ...baseCard, image: { alt: 'x', variants: {} } });
    expect(snap.image).toBeUndefined();
  });
});
