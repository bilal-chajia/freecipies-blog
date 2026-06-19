import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getArticlesByIds } from '../articles.service';

// Mock the drizzle getDb to return a controllable stub.
// The implementation chains: select().from().leftJoin().leftJoin().where(),
// so the object returned by `from()` (and by each `leftJoin()`) must expose
// both `leftJoin` (chainable back to the same object) and the mock `where`.
interface MockChain {
  leftJoin: () => MockChain;
  where: () => Promise<unknown[]>;
}
const where = vi.fn(async () => [] as unknown[]);
const chain: MockChain = { leftJoin: () => chain, where };
const from = vi.fn(() => chain);
const select = vi.fn(() => ({ from }));

vi.mock('../../../../shared/database/drizzle', () => ({
  getDb: () => ({ select }),
}));

describe('getArticlesByIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns [] without querying when ids is empty', async () => {
    const result = await getArticlesByIds({} as never, []);
    expect(result).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  // Helper: make the next where() resolve with the given rows.
  function mockRows(...rows: Array<Record<string, unknown>>) {
    where.mockResolvedValue(rows);
  }

  const baseRow = (id: number) => ({
    id, slug: `slug-${id}`, type: 'recipe', headline: `Recipe ${id}`,
    short_description: 'desc', images_json: '{}', content_json: null,
    recipe_json: null, roundup_json: null, faqs_json: null, seo_json: null,
    cached_category_json: JSON.stringify({ id: 3, label: 'Dinner', slug: 'dinner', color: '#fff' }),
    cached_author_json: null, cached_recipe_json: null, cached_rating_json: null,
    cached_tags_json: '[]', deleted_at: null,
  });

  it('returns rows in the order of input ids', async () => {
    mockRows(baseRow(1), baseRow(2), baseRow(3));
    const result = await getArticlesByIds({} as never, [3, 1, 2]);
    expect(result.map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it('drops ids that do not resolve (no crash)', async () => {
    mockRows(baseRow(1)); // only id 1 resolves
    const result = await getArticlesByIds({} as never, [1, 999]);
    expect(result.map((r) => r.id)).toEqual([1]);
  });

  it('dedupes duplicate ids, preserving first-seen order', async () => {
    mockRows(baseRow(1), baseRow(2));
    const result = await getArticlesByIds({} as never, [1, 1, 2]);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });
});
