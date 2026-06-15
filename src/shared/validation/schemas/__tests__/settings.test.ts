import { describe, expect, it } from 'vitest';
import { HomepageSettingsSchema } from '../settings';

describe('HomepageSettingsSchema', () => {
  it('accepts a valid sections array', () => {
    const result = HomepageSettingsSchema.safeParse({
      seo: { meta_title: 'Home' },
      sections: [
        { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
        {
          id: 'featured',
          type: 'featured_recipes',
          enabled: true,
          title: 'Featured',
          subtitle: '',
          source: 'manual',
          category_slug: null,
          count: 4,
          refs: [
            { article_id: 12, headline: 'Pasta', route: '/recipes/pasta', category: { label: 'Dinner', slug: 'dinner' } },
          ],
        },
        { id: 'faq', type: 'faq', enabled: true, title: 'FAQ', items: [{ question: 'Q?', answer: 'A.' }] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown section type', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'x', type: 'mystery', enabled: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a hero section missing required fields', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'hero', type: 'hero', enabled: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = HomepageSettingsSchema.safeParse({ nope: true });
    expect(result.success).toBe(false);
  });
});
