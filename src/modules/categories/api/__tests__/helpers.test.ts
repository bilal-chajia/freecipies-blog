import { describe, expect, it } from 'vitest';
import { parseImagesJson, parseSeoJson, transformCategoryRequestBody, transformCategoryResponse } from '../helpers';

describe('category API JSON helpers', () => {
  it('does not read camel SEO aliases from seo_json', () => {
    const seo = JSON.parse(parseSeoJson({
      metaTitle: 'Legacy title',
      meta_description: 'Snake description',
      ogImage: '/legacy.webp',
      og_image: '/snake.webp',
      noIndex: true,
      no_index: false,
    }));

    expect(seo).toEqual({
      meta_title: null,
      meta_description: 'Snake description',
      no_index: false,
      og_image: '/snake.webp',
      og_title: null,
      og_description: null,
      twitter_card: 'summary_large_image',
    });
  });

  it('round-trips presentation_json and no longer emits config_json', () => {
    const transformed = transformCategoryRequestBody({
      slug: 'dinners',
      label: 'Dinners',
      short_description: 'Dinner recipes',
      presentation_json: JSON.stringify({
        featured_article: { id: 7, slug: 'roast', title: 'Roast' },
        tldr: 'Cozy dinners',
        hero_cta: { show: true, text: 'Cook', link: '/r/roast' },
        extra: 'drop',
      }),
    });

    expect(transformed.config_json).toBeUndefined();
    expect(JSON.parse(transformed.presentation_json)).toEqual({
      featured_article: { id: 7, slug: 'roast', title: 'Roast' },
      tldr: 'Cozy dinners',
      hero_cta: { show: true, text: 'Cook', link: '/r/roast' },
    });
  });

  it('does not copy stored image variant sizeBytes aliases', () => {
    const images = JSON.parse(parseImagesJson({
      thumbnail: {
        alt: 'Dinner',
        variants: {
          sm: {
            r2_key: 'media/category/dinner-sm.webp',
            width: 320,
            height: 240,
            sizeBytes: 1234,
          },
        },
      },
    }));

    expect(images.thumbnail.variants.sm).toEqual({
      r2_key: 'media/category/dinner-sm.webp',
      width: 320,
      height: 240,
    });
    expect(JSON.stringify(images)).not.toContain('sizeBytes');
  });
});
