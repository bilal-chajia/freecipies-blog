import { describe, expect, it } from 'vitest';
import { getCategoryPageSettings, updateCategoryPageSettings, type SettingsCacheStore } from '../settings.service';
import { CATEGORY_PAGE_SETTINGS_DEFAULTS } from '../../types/settings.types';

// Cache-hit path: getSettingValue returns the cached value WITHOUT touching the DB,
// so we can exercise getCategoryPageSettings with only a cache stub.
function cacheReturning(value: string | null) {
  return {
    get: async () => value,
    put: async () => {},
    delete: async () => {},
  };
}

const NO_DB = {} as never;

describe('getCategoryPageSettings', () => {
  it('merges a stored partial with defaults', async () => {
    const cache = cacheReturning(JSON.stringify({ posts_per_page: 30, layout_mode: 'list' })) as unknown as SettingsCacheStore;
    const result = await getCategoryPageSettings(NO_DB, { cache });
    expect(result.posts_per_page).toBe(30);
    expect(result.layout_mode).toBe('list');
    // unspecified fields fall back to defaults
    expect(result.card_style).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.card_style);
    expect(result.show_sidebar).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.show_sidebar);
  });

  it('exports updateCategoryPageSettings as a function', () => {
    expect(typeof updateCategoryPageSettings).toBe('function');
  });
});
