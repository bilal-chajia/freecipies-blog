import { describe, expect, it } from 'vitest';
import { HomepageSettingsSchema } from '../settings';

describe('HomepageSettingsSchema', () => {
  const resolvedImage = {
    media_id: 55,
    alt: 'Seasonal salad',
    placeholder: 'data:image/jpeg;base64,abc',
    variants: {
      sm: { url: '/api/images/media/salad-sm.webp', width: 720, height: 540 },
      md: { url: '/api/images/media/salad-md.webp', width: 1200, height: 900 },
      lg: { url: '/api/images/media/salad-lg.webp', width: 2048, height: 1536 },
    },
  };

  const socialFeedItems = [
    {
      network: 'instagram',
      caption: 'A fresh summer salad.',
      href: 'https://www.instagram.com/p/summer-salad/',
      image: resolvedImage,
    },
    {
      network: 'facebook',
      caption: 'Our latest weeknight dinner.',
      href: 'https://www.facebook.com/example/posts/123',
      image: resolvedImage,
    },
    {
      network: 'pinterest',
      caption: 'Save this recipe for later.',
      href: 'https://www.pinterest.com/pin/123/',
      image: resolvedImage,
    },
  ];

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

  it('accepts enabled social feeds with Instagram, Facebook, and Pinterest items', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed',
        type: 'social_feed',
        enabled: true,
        eyebrow: 'Follow along',
        title: 'Recipes from our social feed',
        items: socialFeedItems,
      }],
    });

    expect(result.success).toBe(true);
  });

  it('allows disabled social feed drafts with zero to twelve items', () => {
    const emptyDraft = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'social_feed', type: 'social_feed', enabled: false, eyebrow: '', title: '', items: [] }],
    });
    const fullDraft = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed',
        type: 'social_feed',
        enabled: false,
        eyebrow: '',
        title: '',
        items: Array.from({ length: 12 }, () => socialFeedItems[0]),
      }],
    });

    expect(emptyDraft.success).toBe(true);
    expect(fullDraft.success).toBe(true);
  });

  it('rejects incomplete enabled social feeds and unsafe social feed items', () => {
    const tooFewItems = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: socialFeedItems.slice(0, 2),
      }],
    });
    const tooManyItems = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: Array.from({ length: 13 }, () => socialFeedItems[0]),
      }],
    });
    const missingTitle = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: '   ', items: socialFeedItems,
      }],
    });
    const unknownNetwork = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: [{ ...socialFeedItems[0], network: 'youtube' }],
      }],
    });
    const invalidHrefs = ['/recipes/salad', '//example.com/post', 'javascript:alert(1)', 'http://example.com/post'];
    const invalidHrefResults = invalidHrefs.map((href) => HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: socialFeedItems.map((item) => ({ ...item, href })),
      }],
    }));
    const missingImage = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: socialFeedItems.map((item) => ({ ...item, image: null })),
      }],
    });
    const missingAlt = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: socialFeedItems.map((item) => ({ ...item, image: { ...resolvedImage, alt: '   ' } })),
      }],
    });
    const r2Key = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social_feed', type: 'social_feed', enabled: true, eyebrow: '', title: 'Follow us',
        items: socialFeedItems.map((item) => ({
          ...item,
          image: { ...resolvedImage, variants: { ...resolvedImage.variants, md: { ...resolvedImage.variants.md, r2_key: 'media/salad-md.webp' } } },
        })),
      }],
    });

    expect(tooFewItems.success).toBe(false);
    expect(tooManyItems.success).toBe(false);
    expect(missingTitle.success).toBe(false);
    expect(unknownNetwork.success).toBe(false);
    expect(invalidHrefResults.every((result) => !result.success)).toBe(true);
    expect(missingImage.success).toBe(false);
    expect(missingAlt.success).toBe(false);
    expect(r2Key.success).toBe(false);
  });

  it('accepts disabled P3C drafts and complete enabled P3C sections', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [
        { id: 'social_proof', type: 'social_proof', enabled: false, eyebrow: '', title: '', stats: [], testimonials: [], logos: [] },
        { id: 'lead_magnet', type: 'lead_magnet', enabled: false, eyebrow: '', title: '', body: '', image: null, cta: { label: '', href: '' } },
        {
          id: 'social-proof-enabled',
          type: 'social_proof',
          enabled: true,
          eyebrow: 'Trusted recipes',
          title: 'Millions of home cooks',
          stats: [{ value: '4.9', label: 'Average rating' }],
          testimonials: [{ quote: 'Dinner was a hit.', name: 'Alex', role: 'Home cook' }],
          logos: [{ name: 'Recipe Weekly', image: resolvedImage }],
        },
        {
          id: 'lead-magnet-enabled',
          type: 'lead_magnet',
          enabled: true,
          eyebrow: 'Free guide',
          title: 'Plan dinner faster',
          body: 'Get a week of practical recipes.',
          image: resolvedImage,
          cta: { label: 'Get the guide', href: '/guides/weeknight-dinners' },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('accepts enabled social proof without an eyebrow when it has a title and valid item', () => {
    const result = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof-enabled',
        type: 'social_proof',
        enabled: true,
        eyebrow: '   ',
        title: 'Recipes that work',
        stats: [{ value: '500+', label: 'Tested recipes' }],
        testimonials: [],
        logos: [],
      }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects incomplete enabled P3C content and oversized item lists', () => {
    const blankSocialTitle = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: '', title: '   ',
        stats: [{ value: '500+', label: 'Tested recipes' }], testimonials: [], logos: [],
      }],
    });
    const missingSocialItems = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: '', title: 'Recipes that work',
        stats: [], testimonials: [], logos: [],
      }],
    });
    const tooManyStats = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return',
        stats: Array.from({ length: 5 }, (_, index) => ({ value: `${index + 1}`, label: 'Rating' })),
        testimonials: [], logos: [],
      }],
    });
    const tooManyTestimonials = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return', stats: [],
        testimonials: Array.from({ length: 7 }, () => ({ quote: 'Dinner was a hit.', name: 'Alex' })), logos: [],
      }],
    });
    const tooManyLogos = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return', stats: [], testimonials: [],
        logos: Array.from({ length: 7 }, () => ({ name: 'Recipe Weekly', image: resolvedImage })),
      }],
    });
    const blankStatAndTestimonial = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return',
        stats: [{ value: '   ', label: 'Rating' }], testimonials: [{ quote: 'Dinner was a hit.', name: '   ' }], logos: [],
      }],
    });
    const blankLogoName = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return', stats: [], testimonials: [],
        logos: [{ name: '   ', image: { ...resolvedImage, variants: { ...resolvedImage.variants, lg: undefined } } }],
      }],
    });
    const incompleteLeadMagnet = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'lead-magnet', type: 'lead_magnet', enabled: true, eyebrow: 'Free guide', title: '', body: '', image: null, cta: { label: '', href: '' } }],
    });

    expect(blankSocialTitle.success).toBe(false);
    expect(missingSocialItems.success).toBe(false);
    expect(tooManyStats.success).toBe(false);
    expect(tooManyTestimonials.success).toBe(false);
    expect(tooManyLogos.success).toBe(false);
    expect(blankStatAndTestimonial.success).toBe(false);
    expect(blankLogoName.success).toBe(false);
    expect(incompleteLeadMagnet.success).toBe(false);
  });

  it('rejects unsafe P3C CTA URLs and untrusted admin image fields', () => {
    const unsafeHrefs = ['http://example.com', 'javascript:alert(1)', 'data:text/plain,unsafe', '//example.com'];
    const unsafeResults = unsafeHrefs.map((href) => HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'lead-magnet', type: 'lead_magnet', enabled: true, eyebrow: 'Free guide', title: 'Plan dinner faster', body: 'Get practical recipes.', image: resolvedImage,
        cta: { label: 'Get the guide', href },
      }],
    }));
    const r2Key = HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'social-proof', type: 'social_proof', enabled: true, eyebrow: 'Trusted', title: 'Home cooks return', stats: [], testimonials: [],
        logos: [{ name: 'Recipe Weekly', image: { ...resolvedImage, variants: { ...resolvedImage.variants, md: { ...resolvedImage.variants.md, r2_key: 'media/salad-md.webp' } } } }],
      }],
    });
    const unexpectedField = HomepageSettingsSchema.safeParse({
      sections: [{ id: 'lead-magnet', type: 'lead_magnet', enabled: false, eyebrow: '', title: '', body: '', image: null, cta: { label: '', href: '' }, unexpected: true }],
    });

    expect(unsafeResults.every((result) => !result.success)).toBe(true);
    expect(r2Key.success).toBe(false);
    expect(unexpectedField.success).toBe(false);
  });

  it('rejects backslash-normalizable CTA paths while accepting internal and HTTPS URLs', () => {
    const parseLeadMagnetCta = (href: string) => HomepageSettingsSchema.safeParse({
      sections: [{
        id: 'lead-magnet',
        type: 'lead_magnet',
        enabled: true,
        eyebrow: 'Free guide',
        title: 'Plan dinner faster',
        body: 'Get practical recipes.',
        image: resolvedImage,
        cta: { label: 'Get the guide', href },
      }],
    });

    expect(parseLeadMagnetCta('/guides/weeknight-dinners').success).toBe(true);
    expect(parseLeadMagnetCta('https://example.com/guides/weeknight-dinners').success).toBe(true);
    expect(parseLeadMagnetCta('/\\evil.example').success).toBe(false);
    expect(parseLeadMagnetCta('/\\').success).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = HomepageSettingsSchema.safeParse({ nope: true });
    expect(result.success).toBe(false);
  });
});
