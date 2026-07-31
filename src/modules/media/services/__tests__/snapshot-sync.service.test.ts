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
  it('patches the matching spotlight snapshot and invalidates the homepage cache', async () => {
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
    const { updates } = createDrizzle(homepageValue);
    const cache = { delete: vi.fn().mockResolvedValue(undefined) };

    const result = await propagateMediaUpdate(DB, 55, { cache });

    expect(result.homepageSettingsUpdated).toBe(true);
    expect(updates).toHaveLength(1);
    const saved = JSON.parse(String(updates[0].values.value)) as {
      sections: Array<{ id: string; image: Record<string, unknown> }>;
    };
    const image = saved.sections.find((section) => section.id === 'summer')?.image;
    expect(image).toMatchObject({
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
    });
    expect(image).not.toHaveProperty('caption');
    expect(image).not.toHaveProperty('credit');
    expect(cache.delete).toHaveBeenCalledWith('site_settings:v1:homepage_settings');
  });

  it('does not update or invalidate cache when no spotlight references the media', async () => {
    const homepageValue = JSON.stringify({
      seo: {},
      sections: [{
        id: 'summer',
        type: 'seasonal_spotlight',
        enabled: true,
        title: 'Summer cooking',
        body: 'Fresh ideas.',
        image: { media_id: 99, alt: 'Soup', placeholder: 'old', variants: {} },
        cta: { label: 'Browse', href: '/recipes' },
      }],
    });
    const { updates } = createDrizzle(homepageValue);
    const cache = { delete: vi.fn().mockResolvedValue(undefined) };

    const result = await propagateMediaUpdate(DB, 55, { cache });

    expect(result.homepageSettingsUpdated).toBe(false);
    expect(updates).toHaveLength(0);
    expect(cache.delete).not.toHaveBeenCalled();
  });
});
