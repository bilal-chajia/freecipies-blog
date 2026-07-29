import { describe, expect, it } from 'vitest';
import {
  getHomepageSettings,
  updateHomepageSettings,
  type SettingsCacheStore,
} from '../settings.service';
import { DEFAULT_HOME_SECTIONS, HOMEPAGE_SETTINGS_DEFAULTS } from '../../types/settings.types';

// Cache-hit path: getSettingValue returns the cached value WITHOUT touching the DB.
function cacheReturning(value: string | null) {
  return {
    get: async () => value,
    put: async () => {},
    delete: async () => {},
  };
}

const NO_DB = {} as never;

describe('getHomepageSettings', () => {
  it('defaults sections when the stored value is seo-only (back-compat)', async () => {
    const cache = cacheReturning(
      JSON.stringify({ seo: { meta_title: 'Custom' } }),
    ) as unknown as SettingsCacheStore;
    const result = await getHomepageSettings(NO_DB, { cache });
    expect(result.seo.meta_title).toBe('Custom');
    expect(result.sections).toEqual(DEFAULT_HOME_SECTIONS);
  });

  it('appends one disabled FAQ to a stored legacy section list', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: false, mode: 'grid', show_search: false, refs: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;
    const result = await getHomepageSettings(NO_DB, { cache });
    expect(result.sections.map((section) => section.id)).toEqual(['hero', 'faq']);
    expect(result.sections[0].enabled).toBe(false);
    expect(result.sections[1]).toMatchObject({ type: 'faq', enabled: false, items: [] });
    expect(result.seo.meta_title).toBe(HOMEPAGE_SETTINGS_DEFAULTS.seo.meta_title);
  });

  it('does not duplicate an existing FAQ section', async () => {
    const sections = [
      { id: 'faq', type: 'faq', enabled: true, title: 'Help', items: [{ question: 'Q?', answer: 'A.' }] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;
    const result = await getHomepageSettings(NO_DB, { cache });
    expect(result.sections.filter((section) => section.type === 'faq')).toHaveLength(1);
  });

  it('exports updateHomepageSettings as a function', () => {
    expect(typeof updateHomepageSettings).toBe('function');
  });
});
