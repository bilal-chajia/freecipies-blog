import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPopularRecipes } from '../popular-recipes';

const { getArticles, getCloudflareEnvMock } = vi.hoisted(() => ({
  getArticles: vi.fn(async () => ({ items: [], total: 0 })),
  getCloudflareEnvMock: vi.fn((): { DB?: unknown } => ({ DB: {} })),
}));

vi.mock('@modules/articles', () => ({ getArticles }));
vi.mock('@server/cloudflare/env', () => ({ getCloudflareEnv: () => getCloudflareEnvMock() }));

describe('getPopularRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCloudflareEnvMock.mockReturnValue({ DB: {} });
  });

  it('queries published recipes sorted by view_count', async () => {
    await getPopularRecipes('current-slug', 5);
    expect(getArticles).toHaveBeenCalledWith(expect.anything(), {
      type: 'recipe',
      workflow_status: 'published',
      sortBy: 'view_count',
      limit: 6,
    });
  });

  it('returns [] when DB binding is missing', async () => {
    getCloudflareEnvMock.mockReturnValueOnce({});
    const result = await getPopularRecipes('x', 5);
    expect(result).toEqual([]);
    expect(getArticles).not.toHaveBeenCalled();
  });
});
