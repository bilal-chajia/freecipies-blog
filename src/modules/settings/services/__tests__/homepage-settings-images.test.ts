import { describe, expect, it } from 'vitest';
import type { AdminMediaPayload } from '@shared/images/image-contract';
import type { HomepageSettings } from '../../types/settings.types';
import {
  HOMEPAGE_SETTINGS_DEFAULTS,
  type HomepageAdminSettings,
} from '../../types/settings.types';
import * as homepageSettingsImages from '../homepage-settings-images';

const {
  normalizeHomepageSettingsFromAdmin,
  presentHomepageSettingsForAdmin,
} = homepageSettingsImages;

const storedSpotlightImage = {
  media_id: 55,
  alt: 'Seasonal salad',
  placeholder: 'data:image/jpeg;base64,placeholder',
  focal_point: { x: 50, y: 50 },
  aspect_ratio: '4:3',
  variants: {
    sm: { r2_key: 'media/salad-sm.webp', width: 720, height: 540 },
    md: { r2_key: 'media/salad-md.webp', width: 1200, height: 900 },
    lg: { r2_key: 'media/salad-lg.webp', width: 2048, height: 1536 },
  },
};

const stored: HomepageSettings = {
  seo: { ...HOMEPAGE_SETTINGS_DEFAULTS.seo },
  sections: [{
    id: 'seasonal_spotlight',
    type: 'seasonal_spotlight',
    enabled: true,
    title: 'Summer cooking',
    body: 'Fresh recipes for warm days.',
    image: storedSpotlightImage,
    cta: { label: 'Browse recipes', href: '/recipes?tag=summer' },
  }],
};

const storedWithP3cImages = {
  seo: { ...HOMEPAGE_SETTINGS_DEFAULTS.seo },
  sections: [
    ...stored.sections,
    {
      id: 'social_proof',
      type: 'social_proof',
      enabled: true,
      eyebrow: 'Trusted',
      title: 'Home cooks return',
      stats: [],
      testimonials: [],
      logos: [
        { name: 'Recipe Weekly', image: storedSpotlightImage },
        { name: 'Dinner Club', image: storedSpotlightImage },
      ],
    },
    {
      id: 'lead_magnet',
      type: 'lead_magnet',
      enabled: true,
      eyebrow: 'Free guide',
      title: 'Plan dinner faster',
      body: 'Get practical recipes.',
      image: storedSpotlightImage,
      cta: { label: 'Get the guide', href: '/guides/weeknight-dinners' },
    },
    {
      id: 'social_feed',
      type: 'social_feed',
      enabled: true,
      eyebrow: 'Follow along',
      title: 'From our kitchen',
      items: [
        {
          network: 'instagram',
          caption: 'Seasonal salad prep',
          href: 'https://www.instagram.com/p/salad-prep',
          image: storedSpotlightImage,
        },
        {
          network: 'pinterest',
          caption: 'Summer cooking ideas',
          href: 'https://www.pinterest.com/pin/summer-cooking',
          image: storedSpotlightImage,
        },
      ],
    },
  ],
} as unknown as HomepageSettings;

describe('homepage spotlight image API boundary', () => {
  it('round trips every known homepage image location without exposing storage keys', () => {
    const presented = presentHomepageSettingsForAdmin(storedWithP3cImages);

    expect(JSON.stringify(presented)).not.toContain('r2_key');
    expect(JSON.stringify(presented).match(/\/api\/images\//g)).toHaveLength(18);
    expect(normalizeHomepageSettingsFromAdmin(presented)).toEqual(storedWithP3cImages);
  });

  it('rejects foreign and incomplete social-feed image URLs during normalization', () => {
    const presented = presentHomepageSettingsForAdmin(storedWithP3cImages) as unknown as {
      seo: HomepageSettings['seo'];
      sections: Array<{
        type: string;
        logos?: Array<{ image: { variants: { sm: { url: string }; md: { url: string }; lg: { url: string } } } | null }>;
        items?: Array<{ image: { variants: { sm: { url: string }; md: { url: string }; lg: { url: string } } } | null }>;
        image?: { variants: { sm: { url: string }; md: { url: string }; lg: { url: string } } } | null;
      }>;
    };
    const socialFeed = presented.sections.find((section) => section.type === 'social_feed');
    if (!socialFeed?.items?.[0]?.image || !socialFeed.items[1]?.image) {
      throw new Error('Expected social-feed images');
    }
    socialFeed.items[0].image.variants.md.url = 'https://cdn.example.test/social-feed.webp';
    const { lg: _lg, ...incompleteVariants } = socialFeed.items[1].image.variants;
    socialFeed.items[1].image = { variants: incompleteVariants } as never;

    expect(() => normalizeHomepageSettingsFromAdmin(presented as never)).toThrow('local image route');
    socialFeed.items[0].image.variants.md.url = '/api/images/media/salad-md.webp';
    expect(() => normalizeHomepageSettingsFromAdmin(presented as never)).toThrow();
  });

  it('presents public URLs and restores the storage snapshot on save', () => {
    const presented = presentHomepageSettingsForAdmin(stored);

    expect(JSON.stringify(presented)).not.toContain('r2_key');
    expect(JSON.stringify(presented)).toContain('/api/images/media/salad-md.webp');
    expect(normalizeHomepageSettingsFromAdmin(presented)).toEqual(stored);
  });

  it('rejects resolved spotlight URLs outside the image proxy', () => {
    const presented = presentHomepageSettingsForAdmin(stored);
    const spotlight = presented.sections.find((section) => section.type === 'seasonal_spotlight');
    if (!spotlight?.image) throw new Error('Expected a resolved spotlight image');
    spotlight.image.variants.md.url = 'https://cdn.example.test/salad.webp';

    expect(() => normalizeHomepageSettingsFromAdmin(presented)).toThrow('local image route');
  });

  it('rejects an absolute URL and a missing required image variant', () => {
    const absoluteUrl = presentHomepageSettingsForAdmin(stored);
    const absoluteSpotlight = absoluteUrl.sections.find((section) => section.type === 'seasonal_spotlight');
    if (!absoluteSpotlight?.image) throw new Error('Expected a resolved spotlight image');
    absoluteSpotlight.image.variants.md.url = 'https://example.test/api/images/media/salad-md.webp';

    const missingVariant = presentHomepageSettingsForAdmin(stored);
    const missingSpotlight = missingVariant.sections.find((section) => section.type === 'seasonal_spotlight');
    if (!missingSpotlight?.image) throw new Error('Expected a resolved spotlight image');
    const { lg: _lg, ...variantsWithoutLg } = missingSpotlight.image.variants;
    const malformed = {
      ...missingVariant,
      sections: missingVariant.sections.map((section) => (
        section.type === 'seasonal_spotlight'
          ? { ...section, image: { ...section.image!, variants: variantsWithoutLg } }
          : section
      )),
    } as unknown as HomepageAdminSettings;

    expect(() => normalizeHomepageSettingsFromAdmin(absoluteUrl)).toThrow('local image route');
    expect(() => normalizeHomepageSettingsFromAdmin(malformed)).toThrow();
  });

  it('builds an admin-safe homepage snapshot from a Media Library payload', () => {
    const media: AdminMediaPayload = {
      id: 55,
      name: 'seasonal-salad.webp',
      alt_text: 'Seasonal salad',
      caption: null,
      credit: null,
      mime_type: 'image/webp',
      aspect_ratio: '4:3',
      focal_point: { x: 40, y: 60 },
      placeholder: 'data:image/jpeg;base64,placeholder',
      variants: {
        xs: { url: '/api/images/media/salad-xs.webp', width: 360, height: 270 },
        sm: { url: '/api/images/media/salad-sm.webp', width: 720, height: 540 },
        md: { url: '/api/images/media/salad-md.webp', width: 1200, height: 900 },
        lg: { url: '/api/images/media/salad-lg.webp', width: 2048, height: 1536 },
      },
      url: '/api/images/media/salad-lg.webp',
      created_at: null,
      updated_at: null,
      deleted_at: null,
    };

    const buildHomepageImageFromAdminMedia = (homepageSettingsImages as unknown as {
      buildHomepageImageFromAdminMedia: (payload: AdminMediaPayload) => unknown;
    }).buildHomepageImageFromAdminMedia;

    expect(typeof buildHomepageImageFromAdminMedia).toBe('function');
    const image = buildHomepageImageFromAdminMedia(media);

    expect(image).toEqual({
      media_id: 55,
      alt: 'Seasonal salad',
      placeholder: 'data:image/jpeg;base64,placeholder',
      focal_point: { x: 40, y: 60 },
      aspect_ratio: '4:3',
      variants: {
        sm: { url: '/api/images/media/salad-sm.webp', width: 720, height: 540 },
        md: { url: '/api/images/media/salad-md.webp', width: 1200, height: 900 },
        lg: { url: '/api/images/media/salad-lg.webp', width: 2048, height: 1536 },
      },
    });
    expect(JSON.stringify(image)).not.toContain('r2_key');
  });
});
