import { describe, expect, it } from 'vitest';
import {
  CATEGORY_PAGE_SETTINGS_DEFAULTS,
  normalizeCategoryPageSettings,
  type CategoryPageSettings,
} from '../../types/settings.types';

describe('normalizeCategoryPageSettings', () => {
  it('fills missing fields from defaults', () => {
    expect(normalizeCategoryPageSettings(null)).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
    expect(normalizeCategoryPageSettings(undefined)).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
    expect(normalizeCategoryPageSettings({})).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
  });

  it('keeps canonical snake_case overrides', () => {
    const overrides: Partial<CategoryPageSettings> = {
      posts_per_page: 24,
      layout_mode: 'list',
      show_sidebar: false,
      article_sort_order: 'asc',
    };

    expect(normalizeCategoryPageSettings(overrides)).toEqual({
      ...CATEGORY_PAGE_SETTINGS_DEFAULTS,
      ...overrides,
    });
  });

  it('ignores camelCase aliases', () => {
    const legacy = {
      postsPerPage: 99,
      layoutMode: 'masonry',
      showSidebar: false,
    } as Partial<CategoryPageSettings>;

    const result = normalizeCategoryPageSettings(legacy);

    expect(result.posts_per_page).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.posts_per_page);
    expect(result.layout_mode).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.layout_mode);
    expect(result.show_sidebar).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.show_sidebar);
    expect(JSON.stringify(result)).not.toContain('postsPerPage');
  });
});
