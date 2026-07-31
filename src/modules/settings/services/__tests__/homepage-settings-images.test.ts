import { describe, expect, it } from 'vitest';
import type { AdminMediaPayload } from '@shared/images/image-contract';
import type { HomepageSettings } from '../../types/settings.types';
import {
  HOMEPAGE_SETTINGS_DEFAULTS,
  type HomepageAdminSettings,
} from '../../types/settings.types';
import {
  buildHomepageSpotlightImageFromAdminMedia,
  normalizeHomepageSettingsFromAdmin,
  presentHomepageSettingsForAdmin,
} from '../homepage-settings-images';

const stored: HomepageSettings = {
  seo: { ...HOMEPAGE_SETTINGS_DEFAULTS.seo },
  sections: [{
    id: 'seasonal_spotlight',
    type: 'seasonal_spotlight',
    enabled: true,
    title: 'Summer cooking',
    body: 'Fresh recipes for warm days.',
    image: {
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
    },
    cta: { label: 'Browse recipes', href: '/recipes?tag=summer' },
  }],
};

describe('homepage spotlight image API boundary', () => {
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

  it('builds an admin-safe spotlight snapshot from a Media Library payload', () => {
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

    const image = buildHomepageSpotlightImageFromAdminMedia(media);

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
