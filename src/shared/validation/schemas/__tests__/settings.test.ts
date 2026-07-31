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

  it('rejects whitespace-only FAQ questions and answers', () => {
    const whitespaceQuestion = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'faq',
        type: 'faq',
        enabled: true,
        title: 'FAQ',
        items: [{ question: '   ', answer: 'Answer' }],
      }],
    });
    const whitespaceAnswer = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'faq',
        type: 'faq',
        enabled: true,
        title: 'FAQ',
        items: [{ question: 'Question?', answer: '   ' }],
      }],
    });
    expect(whitespaceQuestion.success).toBe(false);
    expect(whitespaceAnswer.success).toBe(false);
  });

  it('accepts quick filters and a complete resolved seasonal spotlight', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [
        {
          id: 'quick_filters',
          type: 'quick_filters',
          enabled: true,
          title: 'Explore recipes',
          filters: [{ label: 'Quick dinners', href: '/recipes?tag=quick' }],
        },
        {
          id: 'seasonal_spotlight',
          type: 'seasonal_spotlight',
          enabled: true,
          title: 'Summer cooking',
          body: 'Fresh ideas for warm days.',
          image: {
            media_id: 55,
            alt: 'Seasonal salad',
            placeholder: 'data:image/jpeg;base64,abc',
            variants: {
              sm: { url: '/api/images/media/salad-sm.webp', width: 720, height: 540 },
              md: { url: '/api/images/media/salad-md.webp', width: 1200, height: 900 },
              lg: { url: '/api/images/media/salad-lg.webp', width: 2048, height: 1536 },
            },
          },
          cta: { label: 'Browse recipes', href: 'https://example.com/summer' },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid P3B section copy, URLs, and image variants', () => {
    const invalidQuickFilter = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'quick_filters',
        type: 'quick_filters',
        enabled: true,
        title: 'Explore recipes',
        filters: [{ label: 'Quick dinners', href: '/articles?tag=quick' }],
      }],
    });
    const invalidSpotlight = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'seasonal_spotlight',
        type: 'seasonal_spotlight',
        enabled: true,
        title: '   ',
        body: '   ',
        image: {
          media_id: 55,
          alt: 'Seasonal salad',
          placeholder: 'data:image/jpeg;base64,abc',
          variants: {
            sm: { url: '/api/images/media/salad-sm.webp', width: 720, height: 540 },
            md: { url: '/api/images/media/salad-md.webp', width: 1200, height: 900, r2_key: 'media/salad-md.webp' },
          },
        },
        cta: { label: '   ', href: 'http://example.com/summer' },
      }],
    });
    const disabledUnsafeCta = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'seasonal_spotlight',
        type: 'seasonal_spotlight',
        enabled: false,
        title: '',
        body: '',
        image: null,
        cta: { label: '', href: 'http://example.com/summer' },
      }],
    });

    expect(invalidQuickFilter.success).toBe(false);
    expect(invalidSpotlight.success).toBe(false);
    expect(disabledUnsafeCta.success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = HomepageSettingsSchema.safeParse({ nope: true });
    expect(result.success).toBe(false);
  });
});
