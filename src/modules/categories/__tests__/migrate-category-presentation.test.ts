import { describe, expect, it } from 'vitest';
import { buildPresentationFromLegacy } from '../../../../scripts/migrate-category-presentation.mts';
import type { CachedCardJson } from '../../articles/types/cache.types';

const card: CachedCardJson = { id: 5, type: 'recipe', slug: 'tart', headline: 'Tart' };
const lookup = async (id: number) => (id === 5 ? card : null);

describe('buildPresentationFromLegacy', () => {
  it('returns empty object when legacy config has nothing relevant', async () => {
    expect(await buildPresentationFromLegacy({}, lookup)).toEqual({});
    expect(await buildPresentationFromLegacy({ posts_per_page: 12 }, lookup)).toEqual({});
  });

  it('migrates tldr', async () => {
    expect(await buildPresentationFromLegacy({ tldr: 'Hi' }, lookup)).toEqual({ tldr: 'Hi' });
  });

  it('builds featured_article snapshot from featured_article_id', async () => {
    const result = await buildPresentationFromLegacy({ featured_article_id: 5 }, lookup);
    expect(result.featured_article).toEqual({ id: 5, slug: 'tart', title: 'Tart' });
  });

  it('drops featured_article_id that resolves to nothing', async () => {
    const result = await buildPresentationFromLegacy({ featured_article_id: 999 }, lookup);
    expect(result.featured_article).toBeUndefined();
  });
});
