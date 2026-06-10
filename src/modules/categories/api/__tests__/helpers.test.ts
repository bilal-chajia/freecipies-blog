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

  it('response never leaks r2_key and emits no camelCase image fields', () => {
    const response = transformCategoryResponse({
      slug: 'dinners',
      images_json: JSON.stringify({
        thumbnail: {
          alt: 'Dinner',
          aspect_ratio: '1:1',
          variants: {
            sm: { r2_key: 'media/category/dinner-sm.webp', width: 320, height: 240 },
          },
        },
      }),
    });

    expect(response.image_url).toBe('/api/images/media/category/dinner-sm.webp');
    expect(response.imageAlt).toBeUndefined();
    expect(response.imageWidth).toBeUndefined();
    expect(response.imageHeight).toBeUndefined();
    expect(JSON.stringify(response)).not.toContain('r2_key');

    const images = JSON.parse(response.images_json);
    expect(images.thumbnail.variants.sm).toEqual({
      url: '/api/images/media/category/dinner-sm.webp',
      width: 320,
      height: 240,
    });
  });

  it('resolved response images round-trip through the request parser back to r2_key', () => {
    const response = transformCategoryResponse({
      images_json: JSON.stringify({
        hero: {
          alt: 'Hero',
          variants: { lg: { r2_key: 'media/category/hero-lg.webp', width: 1600, height: 900 } },
        },
      }),
    });

    const saved = JSON.parse(parseImagesJson(response.images_json));
    expect(saved.hero.variants.lg).toEqual({
      r2_key: 'media/category/hero-lg.webp',
      width: 1600,
      height: 900,
    });
  });

  it('ignores legacy camelCase image fields in request bodies', () => {
    const transformed = transformCategoryRequestBody({
      slug: 'dinners',
      image_url: '/api/images/media/x.webp',
      imageAlt: 'X',
      imageWidth: 100,
      imageHeight: 100,
    });

    expect(transformed.images_json).toBeUndefined();
    expect(transformed.imageAlt).toBeUndefined();
    expect(transformed.image_url).toBeUndefined();
  });
});
