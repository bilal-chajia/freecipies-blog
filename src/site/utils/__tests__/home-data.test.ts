import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getArticles, getArticleById, getCategories, getAuthors } = vi.hoisted(() => ({
  getArticles: vi.fn(),
  getArticleById: vi.fn(),
  getCategories: vi.fn(),
  getAuthors: vi.fn(),
}));

vi.mock('@modules/articles', () => ({ getArticles, getArticleById }));
vi.mock('@modules/categories', () => ({ getCategories }));
vi.mock('@modules/authors', () => ({ getAuthors }));
vi.mock('@shared/utils/hydration', () => ({ hydrateCategory: (c: unknown) => c }));

import { resolveHomeData } from '../home-data';
import type { HomepageSection } from '@modules/settings/types/settings.types';

const DB = {} as never;

beforeEach(() => {
  vi.clearAllMocks();
  getArticles.mockResolvedValue({ items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
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

it('only fetches the shared latest list once across hero + featured + latest', async () => {
  const sections: HomepageSection[] = [
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'F', subtitle: '', source: 'latest', category_slug: null, count: 4, refs: [] },
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
  ];
  await resolveHomeData(sections, { db: DB, stories: [] });
  expect(getArticles).toHaveBeenCalledTimes(1);
});

it('picks the is_featured author when author_id is null', async () => {
  const sections: HomepageSection[] = [
    { id: 'about', type: 'about_author', enabled: true, author_id: null },
  ];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect((vms[0] as { author: { id: number } }).author.id).toBe(9);
});
