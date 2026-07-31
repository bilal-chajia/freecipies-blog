import { beforeEach, describe, expect, it, vi } from 'vitest';
import { siteSettings } from '@modules/settings/schema/settings.schema';

const state = vi.hoisted(() => ({
  drizzle: null as unknown,
}));

vi.mock('@shared/database/drizzle', () => ({
  getDb: () => state.drizzle,
}));

import { propagateMediaUpdate } from '../snapshot-sync.service';

const DB = {} as never;

const mediaRow = {
  id: 55,
  name: 'seasonal-salad.webp',
  alt_text: 'Updated seasonal salad',
  caption: 'This must not be copied',
  credit: JSON.stringify({ type: 'author', id: 7 }),
  mime_type: 'image/webp',
  aspect_ratio: '4:3',
  focal_point_json: JSON.stringify({ x: 40, y: 60 }),
  variants_json: JSON.stringify({
    placeholder: 'data:image/jpeg;base64,new-placeholder',
    variants: {
      xs: { r2_key: 'media/salad-xs.webp', width: 360, height: 270 },
      sm: { r2_key: 'media/salad-sm.webp', width: 720, height: 540 },
      md: { r2_key: 'media/salad-md.webp', width: 1200, height: 900 },
      lg: { r2_key: 'media/salad-lg.webp', width: 2048, height: 1536 },
      original: { r2_key: 'media/salad-original.webp', width: 2400, height: 1800 },
    },
  }),
  created_at: null,
  updated_at: null,
  deleted_at: null,
};

function createDrizzle(homepageValue: string | null) {
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const select = vi.fn(() => ({
    from: (table: unknown) => ({
      where: async () => (table === siteSettings && homepageValue
        ? [{ key: 'homepage_settings', value: homepageValue }]
        : []),
    }),
  }));
  const update = vi.fn((table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        updates.push({ table, values });
      },
    }),
  }));

  state.drizzle = {
    query: { media: { findFirst: vi.fn().mockResolvedValue(mediaRow) } },
    select,
    update,
  };

  return { updates, select, update };
}

beforeEach(() => {
  state.drizzle = null;
});

describe('propagateMediaUpdate homepage snapshot synchronization', () => {
  it('patches every matching P3C homepage image with one settings write and cache invalidation', async () => {
    const homepageValue = JSON.stringify({
      seo: {},
      sections: [
        {
          id: 'summer',
          type: 'seasonal_spotlight',
          enabled: true,
          title: 'Summer cooking',
          body: 'Fresh ideas.',
          image: {
            media_id: 55,
            alt: 'Old salad',
            caption: 'Legacy caption',
            credit: { type: 'author', id: 1 },
            placeholder: 'old-placeholder',
            variants: {
              sm: { r2_key: 'old-sm.webp', width: 720, height: 540 },
              md: { r2_key: 'old-md.webp', width: 1200, height: 900 },
              lg: { r2_key: 'old-lg.webp', width: 2048, height: 1536 },
            },
          },
          cta: { label: 'Browse', href: '/recipes' },
        },
        {
          id: 'trusted',
          type: 'social_proof',
          enabled: true,
          eyebrow: 'Trusted by home cooks',
          title: 'Recipes that work',
          stats: [],
          testimonials: [],
          logos: [
            {
              name: 'Featured publication',
              image: {
                media_id: 55,
                alt: 'Old logo',
                caption: 'Legacy caption',
                credit: { type: 'author', id: 1 },
                placeholder: 'old-logo-placeholder',
                variants: {
                  sm: { r2_key: 'old-logo-sm.webp', width: 720, height: 540 },
                  md: { r2_key: 'old-logo-md.webp', width: 1200, height: 900 },
                  lg: { r2_key: 'old-logo-lg.webp', width: 2048, height: 1536 },
                  original: { r2_key: 'old-logo-original.webp', width: 2400, height: 1800 },
                },
              },
            },
            {
              name: 'Unchanged publication',
              image: {
                media_id: 99,
                alt: 'Unchanged logo',
                placeholder: 'unchanged-logo-placeholder',
                variants: {
                  sm: { r2_key: 'unchanged-logo-sm.webp', width: 720, height: 540 },
                },
              },
            },
          ],
        },
        {
          id: 'guide',
          type: 'lead_magnet',
          enabled: true,
          eyebrow: 'Free guide',
          title: 'Cook better',
          body: 'A practical kitchen guide.',
          image: {
            media_id: 55,
            alt: 'Old guide cover',
            caption: 'Legacy caption',
            credit: { type: 'author', id: 1 },
            placeholder: 'old-guide-placeholder',
            variants: {
              sm: { r2_key: 'old-guide-sm.webp', width: 720, height: 540 },
              md: { r2_key: 'old-guide-md.webp', width: 1200, height: 900 },
              lg: { r2_key: 'old-guide-lg.webp', width: 2048, height: 1536 },
              original: { r2_key: 'old-guide-original.webp', width: 2400, height: 1800 },
            },
          },
          cta: { label: 'Get the guide', href: '/guides' },
          unrelated_image: {
            media_id: 55,
            alt: 'This is not a homepage snapshot location',
            placeholder: 'unrelated-placeholder',
            variants: {
              sm: { r2_key: 'unrelated-sm.webp', width: 720, height: 540 },
            },
          },
        },
        {
          id: 'other-guide',
          type: 'lead_magnet',
          enabled: true,
          eyebrow: 'Another guide',
          title: 'Keep this cover',
          body: 'This image belongs to another media record.',
          image: {
            media_id: 99,
            alt: 'Unchanged guide cover',
            placeholder: 'unchanged-guide-placeholder',
            variants: {
              sm: { r2_key: 'unchanged-guide-sm.webp', width: 720, height: 540 },
            },
          },
          cta: { label: 'Get the guide', href: '/other-guides' },
        },
        {
          id: 'autumn',
          type: 'seasonal_spotlight',
          enabled: true,
          title: 'Autumn cooking',
          body: 'Warm recipes.',
          image: { media_id: 99, alt: 'Soup', placeholder: 'old', variants: {} },
          cta: { label: 'Browse', href: '/recipes' },
        },
      ],
    });
    const original = JSON.parse(homepageValue) as {
      sections: Array<Record<string, unknown>>;
    };
    const { updates } = createDrizzle(homepageValue);
    const cache = { delete: vi.fn().mockResolvedValue(undefined) };

    const result = await propagateMediaUpdate(DB, 55, { cache });

    expect(result.homepageSettingsUpdated).toBe(true);
    expect(updates).toHaveLength(1);
    expect(cache.delete).toHaveBeenCalledTimes(1);
    expect(cache.delete).toHaveBeenCalledWith('site_settings:v1:homepage_settings');

    const saved = JSON.parse(String(updates[0].values.value)) as {
      sections: Array<Record<string, unknown>>;
    };
    const expectedImage = {
      media_id: 55,
      alt: 'Updated seasonal salad',
      placeholder: 'data:image/jpeg;base64,new-placeholder',
      focal_point: { x: 40, y: 60 },
      aspect_ratio: '4:3',
      variants: {
        sm: { r2_key: 'media/salad-sm.webp', width: 720, height: 540 },
        md: { r2_key: 'media/salad-md.webp', width: 1200, height: 900 },
        lg: { r2_key: 'media/salad-lg.webp', width: 2048, height: 1536 },
      },
    };

    const summer = saved.sections.find((section) => section.id === 'summer');
    const socialProof = saved.sections.find((section) => section.id === 'trusted');
    const leadMagnet = saved.sections.find((section) => section.id === 'guide');
    expect(summer?.image).toEqual(expectedImage);
    expect((socialProof?.logos as Array<Record<string, unknown>>)[0].image).toEqual(expectedImage);
    expect(leadMagnet?.image).toEqual(expectedImage);

    const originalAutumn = original.sections.find((section) => section.id === 'autumn');
    const originalSocialProof = original.sections.find((section) => section.id === 'trusted');
    const originalUnchangedLogo = ((originalSocialProof?.logos as Array<Record<string, unknown>>)[1].image);
    const originalOtherGuide = original.sections.find((section) => section.id === 'other-guide');
    const originalUnrelatedImage = original.sections.find((section) => section.id === 'guide')?.unrelated_image;
    expect(JSON.stringify(saved.sections.find((section) => section.id === 'autumn')))
      .toBe(JSON.stringify(originalAutumn));
    expect(JSON.stringify((socialProof?.logos as Array<Record<string, unknown>>)[1].image))
      .toBe(JSON.stringify(originalUnchangedLogo));
    expect(JSON.stringify(saved.sections.find((section) => section.id === 'other-guide')))
      .toBe(JSON.stringify(originalOtherGuide));
    expect(JSON.stringify(leadMagnet?.unrelated_image)).toBe(JSON.stringify(originalUnrelatedImage));
  });

  it('does not update or invalidate cache when no known homepage snapshot references the media', async () => {
    const homepageValue = JSON.stringify({
      seo: {},
      sections: [
        {
          id: 'summer',
          type: 'seasonal_spotlight',
          enabled: true,
          title: 'Summer cooking',
          body: 'Fresh ideas.',
          image: { media_id: 99, alt: 'Soup', placeholder: 'old', variants: {} },
          cta: { label: 'Browse', href: '/recipes' },
        },
        {
          id: 'trusted',
          type: 'social_proof',
          enabled: true,
          eyebrow: 'Trusted',
          title: 'Recipes that work',
          stats: [],
          testimonials: [],
          logos: [{ name: 'Publication', image: { media_id: 99, alt: 'Logo', placeholder: 'old', variants: {} } }],
        },
        {
          id: 'guide',
          type: 'lead_magnet',
          enabled: true,
          eyebrow: 'Free guide',
          title: 'Cook better',
          body: 'A practical kitchen guide.',
          image: { media_id: 99, alt: 'Guide', placeholder: 'old', variants: {} },
          cta: { label: 'Get the guide', href: '/guides' },
        },
      ],
    });
    const { updates } = createDrizzle(homepageValue);
    const cache = { delete: vi.fn().mockResolvedValue(undefined) };

    const result = await propagateMediaUpdate(DB, 55, { cache });

    expect(result.homepageSettingsUpdated).toBe(false);
    expect(updates).toHaveLength(0);
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
