import { describe, expect, it } from 'vitest';
import {
  buildFeaturedArticleSnapshot,
  enrichPresentationFeatured,
  resyncPresentationFeatured,
} from '../featured-article';
import type { CachedCardJson } from '../../../articles/types/cache.types';

const baseCard: CachedCardJson = {
  id: 42,
  type: 'recipe',
  slug: 'fluffy-pancakes',
  headline: 'Fluffy Pancakes',
};

const cardWithImage: CachedCardJson = {
  ...baseCard,
  image: {
    media_id: 55,
    alt: 'Stack of pancakes',
    placeholder: 'data:image/jpeg;base64,xyz',
    variants: {
      sm: { r2_key: 'media/p-sm.webp', width: 720, height: 405 },
      lg: { r2_key: 'media/p-lg.webp', width: 2048, height: 1152 },
    },
  } as CachedCardJson['image'],
};

describe('buildFeaturedArticleSnapshot', () => {
  it('maps id/slug/headline to id/slug/title', () => {
    const snap = buildFeaturedArticleSnapshot(baseCard);
    expect(snap).toEqual({ id: 42, slug: 'fluffy-pancakes', title: 'Fluffy Pancakes' });
  });

  it('copies the stored r2_key variants from the card cache (stored snapshot contract)', () => {
    const snap = buildFeaturedArticleSnapshot(cardWithImage);
    expect(snap.image).toEqual({
      media_id: 55,
      alt: 'Stack of pancakes',
      placeholder: 'data:image/jpeg;base64,xyz',
      variants: {
        sm: { r2_key: 'media/p-sm.webp', width: 720, height: 405 },
        lg: { r2_key: 'media/p-lg.webp', width: 2048, height: 1152 },
      },
    });
    // Stored snapshots keep r2_key and never a resolved url.
    expect(JSON.stringify(snap)).not.toContain('"url"');
  });

  it('never copies the original variant', () => {
    const snap = buildFeaturedArticleSnapshot({
      ...baseCard,
      image: {
        alt: 'x',
        variants: {
          sm: { r2_key: 'media/p-sm.webp', width: 720, height: 405 },
          original: { r2_key: 'media/p-original.jpg', width: 4000, height: 2250 },
        },
      } as CachedCardJson['image'],
    });
    expect(JSON.stringify(snap)).not.toContain('original');
    expect(snap.image?.variants.sm).toBeDefined();
  });

  it('omits image when no variant exists', () => {
    const snap = buildFeaturedArticleSnapshot({
      ...baseCard,
      image: { alt: 'x', variants: {} },
    });
    expect(snap.image).toBeUndefined();
  });
});

describe('enrichPresentationFeatured', () => {
  const lookup = async (id: number) => (id === 42 ? cardWithImage : null);

  it('builds the stored snapshot from the selected article id', async () => {
    const enriched = await enrichPresentationFeatured(
      JSON.stringify({ featured_article: { id: 42, slug: 'stale', title: 'Stale' }, tldr: 'Hi' }),
      lookup,
    );
    const parsed = JSON.parse(enriched);
    expect(parsed.featured_article.slug).toBe('fluffy-pancakes');
    expect(parsed.featured_article.image.variants.sm.r2_key).toBe('media/p-sm.webp');
    expect(parsed.tldr).toBe('Hi');
  });

  it('drops featured_article when the article cannot be resolved', async () => {
    const enriched = await enrichPresentationFeatured(
      JSON.stringify({ featured_article: { id: 999, slug: 'x', title: 'X' }, tldr: 'Keep' }),
      lookup,
    );
    expect(JSON.parse(enriched)).toEqual({ tldr: 'Keep' });
  });

  it('passes through presentations without featured_article', async () => {
    const enriched = await enrichPresentationFeatured(JSON.stringify({ tldr: 'Only' }), lookup);
    expect(JSON.parse(enriched)).toEqual({ tldr: 'Only' });
  });
});

describe('resyncPresentationFeatured', () => {
  const presentation = JSON.stringify({
    featured_article: { id: 42, slug: 'old-slug', title: 'Old Title' },
    tldr: 'Keep me',
  });

  it('returns null when presentation is empty, invalid, or not about this article', () => {
    expect(resyncPresentationFeatured(null, 42, baseCard)).toBeNull();
    expect(resyncPresentationFeatured('', 42, baseCard)).toBeNull();
    expect(resyncPresentationFeatured('not json', 42, baseCard)).toBeNull();
    expect(resyncPresentationFeatured('{}', 42, baseCard)).toBeNull();
    expect(resyncPresentationFeatured(presentation, 7, baseCard)).toBeNull();
  });

  it('rebuilds the stored snapshot from the fresh card and preserves other fields', () => {
    const updated = resyncPresentationFeatured(presentation, 42, cardWithImage);
    expect(updated).not.toBeNull();
    const parsed = JSON.parse(updated as string);
    expect(parsed.featured_article.slug).toBe('fluffy-pancakes');
    expect(parsed.featured_article.image.variants.lg.r2_key).toBe('media/p-lg.webp');
    expect(parsed.tldr).toBe('Keep me');
  });

  it('returns null when the snapshot is already up to date', () => {
    const fresh = JSON.stringify({
      featured_article: { id: 42, slug: 'fluffy-pancakes', title: 'Fluffy Pancakes' },
    });
    expect(resyncPresentationFeatured(fresh, 42, baseCard)).toBeNull();
  });

  it('clears the snapshot when the article is deleted/unpublished (card = null)', () => {
    const updated = resyncPresentationFeatured(presentation, 42, null);
    expect(JSON.parse(updated as string)).toEqual({ tldr: 'Keep me' });
  });
});
