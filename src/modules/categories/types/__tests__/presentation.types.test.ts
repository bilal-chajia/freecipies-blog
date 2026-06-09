import { describe, expect, it } from 'vitest';
import { HERO_CTA_DEFAULT, type CategoryPresentation, type FeaturedArticleSnapshot } from '../presentation.types';

describe('presentation types', () => {
  it('HERO_CTA_DEFAULT is disabled by default', () => {
    expect(HERO_CTA_DEFAULT).toEqual({ show: false, text: '', link: '' });
  });

  it('types compose a valid presentation object', () => {
    const snap: FeaturedArticleSnapshot = { id: 1, slug: 'a', title: 'A' };
    const p: CategoryPresentation = { featured_article: snap, tldr: 'x', hero_cta: HERO_CTA_DEFAULT };
    expect(p.featured_article?.id).toBe(1);
  });
});
