import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getArticles, getArticleById, getArticlesByIds, getCategories, getAuthors } = vi.hoisted(() => ({
  getArticles: vi.fn(),
  getArticleById: vi.fn(),
  getArticlesByIds: vi.fn(),
  getCategories: vi.fn(),
  getAuthors: vi.fn(),
}));

vi.mock('@modules/articles', () => ({ getArticles, getArticleById, getArticlesByIds }));
vi.mock('@modules/categories', () => ({ getCategories }));
vi.mock('@modules/authors', () => ({ getAuthors }));
vi.mock('@shared/utils/hydration', () => ({ hydrateCategory: (c: unknown) => c }));

import { resolveHomeData } from '../home-data';
import type { HomepageSection } from '@modules/settings/types/settings.types';

const DB = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  getArticles.mockResolvedValue({ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
  // Batched resolver returns hydrated stubs in input order.
  getArticlesByIds.mockImplementation(async (_db: unknown, ids: number[]) =>
    ids.map((id) => ({ id }) as never),
  );
  getCategories.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  getAuthors.mockResolvedValue([{ id: 9, is_featured: true }, { id: 10, is_featured: false }]);
});

it('skips disabled sections', async () => {
  const sections: HomepageSection[] = [
    { id: 'latest', type: 'latest', enabled: false, title: 'L', count: 4 },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms).toHaveLength(0);
});

it('resolves latest recipes via getArticles and respects count', async () => {
  const sections: HomepageSection[] = [
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 2 },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms[0]).toMatchObject({ kind: 'latest' });
  expect((vms[0] as { recipes: unknown[] }).recipes).toHaveLength(2);
  expect(getArticles).toHaveBeenCalledWith(DB, expect.objectContaining({ type: 'recipe', workflow_status: 'published' }));
});

it('fetches the shared latest list once for featured + latest, plus one trending call for hero', async () => {
  const sections: HomepageSection[] = [
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'F', subtitle: '', source: 'latest', category_slug: null, count: 4, refs: [] },
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  // Hero fallback uses its own trending cache; featured (latest source) and
  // latest share the latest cache — so exactly two getArticles calls total.
  expect(getArticles).toHaveBeenCalledTimes(2);
  const calls = (getArticles as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  expect(calls.filter((c) => (c[1] as { sortBy?: string })?.sortBy === 'view_count')).toHaveLength(1);
});

it('picks the is_featured author when author_id is null', async () => {
  const sections: HomepageSection[] = [
    { id: 'about', type: 'about_author', enabled: true, author_id: null },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect((vms[0] as { author: { id: number } }).author.id).toBe(9);
});

it('resolves hero manual refs via getArticlesByIds (no N+1 getArticleById)', async () => {
  const sections: HomepageSection[] = [
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false,
      refs: [{ article_id: 11, headline: 'A', route: '/recipes/a' }, { article_id: 22, headline: 'B', route: '/recipes/b' }] },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticlesByIds).toHaveBeenCalledWith(DB, [11, 22], {
    type: 'recipe',
    workflow_status: 'published',
  });
  expect(getArticleById).not.toHaveBeenCalled();
  expect((vms[0] as { recipes: { id: number }[] }).recipes.map((r) => r.id)).toEqual([11, 22]);
});

it('resolves featured manual refs as published recipes', async () => {
  const sections: HomepageSection[] = [
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'F', subtitle: '',
      source: 'manual', category_slug: null, count: 4,
      refs: [{ article_id: 11, headline: 'A', route: '/recipes/a' }] },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticlesByIds).toHaveBeenCalledWith(DB, [11], {
    type: 'recipe',
    workflow_status: 'published',
  });
});

it('resolves collections manual refs via getArticlesByIds', async () => {
  const sections: HomepageSection[] = [
    { id: 'collections', type: 'collections', enabled: true, title: 'Collections', subtitle: '', refs: [{ roundup_id: 5, title: 'R', route: '/roundups/r' }] },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticlesByIds).toHaveBeenCalledWith(DB, [5], {
    type: 'roundup',
    workflow_status: 'published',
  });
  expect(getArticleById).not.toHaveBeenCalled();
});

it('resolves only complete FAQ items', async () => {
  const sections: HomepageSection[] = [{
    id: 'faq',
    type: 'faq',
    enabled: true,
    title: 'FAQ',
    items: [
      { question: ' Valid? ', answer: ' Yes. ' },
      { question: '', answer: 'Missing question' },
      { question: 'Missing answer', answer: '   ' },
    ],
  }];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms).toEqual([expect.objectContaining({
    kind: 'faq',
    items: [{ question: 'Valid?', answer: 'Yes.' }],
  })]);
});

describe('resolveHomeData — hero fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to distinct trending vs latest responses so tests can distinguish them.
    getArticles.mockImplementation(async (_db: unknown, opts?: { sortBy?: string }) => {
      if (opts?.sortBy === 'view_count') {
        return { items: [{ id: 100, slug: 'trend', type: 'recipe', headline: 'Trend' }], total: 1 };
      }
      return { items: [{ id: 1, slug: 'latest', type: 'recipe', headline: 'Latest' }], total: 1 };
    });
  });

  it('uses trending (view_count desc) when hero has no refs', async () => {
    const sections: HomepageSection[] = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
    ];
    const vms = await resolveHomeData(sections, { db: DB, stories: [] });
    const hero = vms.find((v) => v.kind === 'hero') as { recipes: { id: number }[] } | undefined;
    expect(hero).toBeDefined();
    expect(hero!.recipes[0].id).toBe(100); // trending, not latest
    expect(getArticles).toHaveBeenCalledWith(DB, expect.objectContaining({ sortBy: 'view_count' }));
  });

  it('returns empty recipes (no trending) when hero refs are all dead', async () => {
    getArticlesByIds.mockResolvedValue([]); // all refs soft-deleted
    const sections: HomepageSection[] = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false,
        refs: [{ article_id: 7, headline: 'gone', route: '/recipes/gone' }] },
    ];
    const vms = await resolveHomeData(sections, { db: DB, stories: [] });
    const hero = vms.find((v) => v.kind === 'hero') as { recipes: unknown[] } | undefined;
    expect(hero).toBeDefined();
    expect(hero!.recipes).toEqual([]);
    expect(getArticles).not.toHaveBeenCalledWith(DB, expect.objectContaining({ sortBy: 'view_count' }));
  });

  it('caches trending so two hero-fallback sections do one DB call', async () => {
    getArticles.mockResolvedValue({ items: [{ id: 9, slug: 't', type: 'recipe', headline: 'T' }], total: 1 });
    await resolveHomeData(
      [
        { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
        { id: 'hero2', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
      ],
      { db: DB, stories: [] },
    );
    const trendingCalls = (getArticles as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .filter((c) => (c[1] as { sortBy?: string })?.sortBy === 'view_count');
    expect(trendingCalls).toHaveLength(1);
  });
});
