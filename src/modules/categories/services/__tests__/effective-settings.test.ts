import { describe, expect, it } from 'vitest';
import { mergeEffectiveCategorySettings } from '../effective-settings';
import { CATEGORY_PAGE_SETTINGS_DEFAULTS } from '../../../settings/types/settings.types';

describe('mergeEffectiveCategorySettings', () => {
  it('uses global settings when presentation is empty', () => {
    const eff = mergeEffectiveCategorySettings(CATEGORY_PAGE_SETTINGS_DEFAULTS, {});
    expect(eff.posts_per_page).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.posts_per_page);
    expect(eff.featured_article).toBeNull();
    expect(eff.tldr).toBe('');
  });

  it('overlays per-category editorial content', () => {
    const eff = mergeEffectiveCategorySettings(CATEGORY_PAGE_SETTINGS_DEFAULTS, {
      featured_article: { id: 9, slug: 's', title: 'T' },
      tldr: 'Intro',
      hero_cta: { show: true, text: 'Go', link: '/x' },
    });
    expect(eff.featured_article).toEqual({ id: 9, slug: 's', title: 'T' });
    expect(eff.tldr).toBe('Intro');
    expect(eff.hero_cta).toEqual({ show: true, text: 'Go', link: '/x' });
    expect(eff.layout_mode).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.layout_mode);
  });
});
