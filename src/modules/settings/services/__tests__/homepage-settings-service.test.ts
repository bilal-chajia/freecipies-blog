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

function legacySections() {
  return [
    { id: 'stories', type: 'stories', enabled: true },
    { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
    { id: 'quick_filters', type: 'quick_filters', enabled: false, title: 'Explore recipes', filters: [] },
    { id: 'featured', type: 'featured_recipes', enabled: true, title: 'Featured Recipes', subtitle: 'Handpicked for you', source: 'latest', category_slug: null, count: 4, refs: [] },
    { id: 'categories', type: 'category_browse', enabled: true, title: 'Browse by Category', subtitle: '', max: 8 },
    { id: 'collections', type: 'collections', enabled: true, title: 'Recipe Collections', subtitle: '', refs: [] },
    { id: 'seasonal_spotlight', type: 'seasonal_spotlight', enabled: false, title: 'Seasonal spotlight', body: '', image: null, cta: { label: '', href: '' } },
    { id: 'latest', type: 'latest', enabled: true, title: 'Latest Recipes', count: 8 },
    { id: 'about', type: 'about_author', enabled: true, author_id: null },
    { id: 'newsletter', type: 'newsletter', enabled: true, title: 'Get New Recipes Weekly', subtitle: 'Subscribe to receive delicious recipes straight to your inbox.', button_text: 'Subscribe', placeholder_text: 'Your email address' },
    { id: 'faq', type: 'faq', enabled: false, title: 'Frequently Asked Questions', items: [] },
  ];
}

function createHomepageSettingsDb(persisted: { value?: string }) {
  return {
    query: {
      siteSettings: {
        findFirst: async () => null,
      },
    },
    insert: () => ({
      values: async (value: { value: string }) => {
        persisted.value = value.value;
      },
    }),
  } as never;
}

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
      'social_proof',
      'social_feed',
      'lead_magnet',
      'faq',
    ]);
    expect(result.sections[0].enabled).toBe(false);
    expect(result.sections[6]).toMatchObject({ type: 'faq', enabled: false, items: [] });
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
      'social_proof',
      'social_feed',
      'lead_magnet',
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

  it('inserts disabled P3C and P3D defaults at their catalog anchors without changing legacy order', async () => {
    const cache = cacheReturning(JSON.stringify({ sections: legacySections() })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.map((section) => section.id)).toEqual([
      'stories', 'hero', 'quick_filters', 'featured', 'categories', 'collections',
      'seasonal_spotlight', 'latest', 'social_proof', 'social_feed', 'about', 'lead_magnet',
      'newsletter', 'faq',
    ]);
    expect(result.sections.find((section) => section.type === 'social_proof')).toMatchObject({
      enabled: false,
      eyebrow: '',
      title: '',
      stats: [],
      testimonials: [],
      logos: [],
    });
    expect(result.sections.find((section) => section.type === 'lead_magnet')).toMatchObject({
      enabled: false,
      eyebrow: '',
      title: '',
      body: '',
      image: null,
      cta: { label: '', href: '' },
    });
    expect(result.sections.find((section) => section.type === 'social_feed')).toMatchObject({
      enabled: false,
      eyebrow: '',
      title: '',
      items: [],
    });
    expect(result.sections.at(-1)?.type).toBe('faq');
  });

  it('preserves an existing P3C section once while inserting the missing catalog peer at its anchor', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
      { id: 'latest', type: 'latest', enabled: true, title: 'Latest Recipes', count: 8 },
      { id: 'social_proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return', stats: [{ value: '4.9', label: 'Average rating' }], testimonials: [], logos: [] },
      { id: 'about', type: 'about_author', enabled: true, author_id: null },
      { id: 'newsletter', type: 'newsletter', enabled: true, title: 'Get New Recipes Weekly', subtitle: 'Subscribe to receive delicious recipes straight to your inbox.', button_text: 'Subscribe', placeholder_text: 'Your email address' },
      { id: 'faq', type: 'faq', enabled: false, title: 'Frequently Asked Questions', items: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.map((section) => section.id)).toEqual([
      'hero', 'latest', 'social_proof', 'social_feed', 'about', 'lead_magnet', 'newsletter',
      'quick_filters', 'seasonal_spotlight', 'faq',
    ]);
    expect(result.sections.filter((section) => section.type === 'social_proof')).toHaveLength(1);
    expect(result.sections.filter((section) => section.type === 'social_feed')).toHaveLength(1);
    expect(result.sections.filter((section) => section.type === 'lead_magnet')).toHaveLength(1);
    expect(result.sections.at(-1)?.type).toBe('faq');
  });

  it('inserts social feed before about author after adding a missing social proof', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
      { id: 'about', type: 'about_author', enabled: true, author_id: null },
      { id: 'newsletter', type: 'newsletter', enabled: true, title: 'Weekly recipes', subtitle: '', button_text: 'Subscribe', placeholder_text: 'Email' },
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.map((section) => section.id)).toEqual([
      'hero', 'social_proof', 'social_feed', 'about', 'lead_magnet', 'newsletter',
      'quick_filters', 'seasonal_spotlight', 'faq',
    ]);
  });

  it('inserts social feed before newsletter when social proof and about author are absent', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
      { id: 'newsletter', type: 'newsletter', enabled: true, title: 'Weekly recipes', subtitle: '', button_text: 'Subscribe', placeholder_text: 'Email' },
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.map((section) => section.id)).toEqual([
      'hero', 'social_feed', 'lead_magnet', 'newsletter',
      'quick_filters', 'seasonal_spotlight', 'social_proof', 'faq',
    ]);
  });

  it('inserts lead magnet before newsletter when a partial setting omits about author', async () => {
    const sections = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
      { id: 'latest', type: 'latest', enabled: true, title: 'Latest Recipes', count: 8 },
      { id: 'newsletter', type: 'newsletter', enabled: true, title: 'Weekly recipes', subtitle: '', button_text: 'Subscribe', placeholder_text: 'Email' },
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
    ];
    const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;

    const result = await getHomepageSettings(NO_DB, { cache });

    expect(result.sections.map((section) => section.id)).toEqual([
      'hero', 'latest', 'social_proof', 'social_feed', 'lead_magnet', 'newsletter',
      'quick_filters', 'seasonal_spotlight', 'faq',
    ]);
  });

  it('normalizes direct saves before returning and persisting them', async () => {
    const persisted: { value?: string } = {};
    const result = await updateHomepageSettings(
      createHomepageSettingsDb(persisted),
      { sections: legacySections() as never },
    );
    const stored = JSON.parse(persisted.value ?? '{}') as { sections: Array<{ id: string }> };
    const expected = [
      'stories', 'hero', 'quick_filters', 'featured', 'categories', 'collections',
      'seasonal_spotlight', 'latest', 'social_proof', 'social_feed', 'about', 'lead_magnet',
      'newsletter', 'faq',
    ];

    expect(result.sections.map((section) => section.id)).toEqual(expected);
    expect(stored.sections.map((section) => section.id)).toEqual(expected);
  });

  it('applies partial-setting fallback ordering to direct saves and persisted settings', async () => {
    const persisted: { value?: string } = {};
    const sections = [
      { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
      { id: 'about', type: 'about_author', enabled: true, author_id: null },
      { id: 'newsletter', type: 'newsletter', enabled: true, title: 'Weekly recipes', subtitle: '', button_text: 'Subscribe', placeholder_text: 'Email' },
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
    ];

    const result = await updateHomepageSettings(
      createHomepageSettingsDb(persisted),
      { sections: sections as never },
    );
    const stored = JSON.parse(persisted.value ?? '{}') as { sections: Array<{ id: string }> };
    const expected = [
      'hero', 'social_proof', 'social_feed', 'about', 'lead_magnet', 'newsletter',
      'quick_filters', 'seasonal_spotlight', 'faq',
    ];

    expect(result.sections.map((section) => section.id)).toEqual(expected);
    expect(stored.sections.map((section) => section.id)).toEqual(expected);
  });
});
