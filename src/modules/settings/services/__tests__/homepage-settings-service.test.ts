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
    expect(result.sections.map((section) => section.id)).toEqual([
      'hero',
      'quick_filters',
      'seasonal_spotlight',
      'faq',
    ]);
    expect(result.sections[0].enabled).toBe(false);
    expect(result.sections[3]).toMatchObject({ type: 'faq', enabled: false, items: [] });
    expect(result.seo.meta_title).toBe(HOMEPAGE_SETTINGS_DEFAULTS.seo.meta_title);
  });

  it('adds missing disabled P3B sections before the fixed-last FAQ', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: false, mode: 'grid', show_search: false, refs: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.map((section) => section.id)).toEqual([
      'hero',
      'quick_filters',
      'seasonal_spotlight',
      'faq',
    ]);
    expect(result.sections.find((section) => section.type === 'quick_filters')).toMatchObject({
      enabled: false,
      filters: [],
    });
    expect(result.sections.find((section) => section.type === 'seasonal_spotlight')).toMatchObject({
      enabled: false,
      image: null,
    });
  });

  it('does not duplicate an existing FAQ section', async () => {
    const sections = [
      { id: 'faq', type: 'faq', enabled: true, title: 'Help', items: [{ question: 'Q?', answer: 'A.' }] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;
    const result = await getHomepageSettings(NO_DB, { cache });
    expect(result.sections.filter((section) => section.type === 'faq')).toHaveLength(1);
  });

  it('does not duplicate existing P3B sections', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
      { id: 'quick_filters', type: 'quick_filters', enabled: true, title: 'Explore', filters: [] },
      {
        id: 'seasonal_spotlight',
        type: 'seasonal_spotlight',
        enabled: false,
        title: 'Seasonal spotlight',
        body: '',
        image: null,
        cta: { label: '', href: '' },
      },
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.filter((section) => section.type === 'quick_filters')).toHaveLength(1);
    expect(result.sections.filter((section) => section.type === 'seasonal_spotlight')).toHaveLength(1);
    expect(result.sections.at(-1)?.type).toBe('faq');
  });

  it('exports updateHomepageSettings as a function', () => {
    expect(typeof updateHomepageSettings).toBe('function');
  });
});
