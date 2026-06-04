import { describe, expect, it } from 'vitest';
import { parseConfigJson, parseImagesJson, parseSeoJson, transformCategoryRequestBody, transformCategoryResponse } from '../helpers';

describe('category API JSON helpers', () => {
  it('normalizes category config with snake_case keys only', () => {
    const config = JSON.parse(parseConfigJson({
      posts_per_page: 9,
      postsPerPage: 99,
      layout_mode: 'list',
      layoutMode: 'masonry',
      card_style: 'compact',
      show_sidebar: false,
      featured_article_id: '12',
      featuredArticleId: 99,
      show_featured_recipe: false,
      showHeroCta: false,
      hero_cta_text: 'Cook now',
      heroCtaText: 'Legacy',
    }));

    expect(config).toEqual({
      posts_per_page: 9,
      layout_mode: 'list',
      card_style: 'compact',
      show_sidebar: false,
      featured_article_id: 12,
      show_featured_recipe: false,
      hero_cta_text: 'Cook now',
    });
    expect(JSON.stringify(config)).not.toContain('postsPerPage');
    expect(JSON.stringify(config)).not.toContain('featuredArticleId');
    expect(JSON.stringify(config)).not.toContain('heroCtaText');
  });

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

  it('emits snake_case config fields from category responses', () => {
    const response = transformCategoryResponse({
      id: 1,
      slug: 'dinners',
      config_json: JSON.stringify({
        posts_per_page: 6,
        layout_mode: 'grid',
        card_style: 'full',
        show_sidebar: true,
        article_sort_by: 'published_at',
        article_sort_order: 'desc',
        show_hero_cta: false,
      }),
    });

    expect(response.posts_per_page).toBe(6);
    expect(response.layout_mode).toBe('grid');
    expect(response.card_style).toBe('full');
    expect(response.show_sidebar).toBe(true);
    expect(response.article_sort_by).toBe('published_at');
    expect(response.article_sort_order).toBe('desc');
    expect(response.show_hero_cta).toBe(false);
    expect(response.postsPerPage).toBeUndefined();
    expect(response.layoutMode).toBeUndefined();
    expect(response.showHeroCta).toBeUndefined();
  });

  it('persists category config overrides as snake_case config_json', () => {
    const transformed = transformCategoryRequestBody({
      slug: 'dinners',
      label: 'Dinners',
      short_description: 'Dinner recipes',
      postsPerPage: 8,
      layoutMode: 'list',
      showHeroCta: false,
      heroCtaText: 'Cook now',
      config_json: JSON.stringify({
        card_style: 'compact',
        show_sidebar: true,
      }),
    });

    expect(transformed.postsPerPage).toBeUndefined();
    expect(transformed.layoutMode).toBeUndefined();
    expect(transformed.showHeroCta).toBeUndefined();
    expect(transformed.config_json).toBeTypeOf('string');
    expect(JSON.parse(transformed.config_json)).toEqual({
      card_style: 'compact',
      show_sidebar: true,
      posts_per_page: 8,
      layout_mode: 'list',
      show_hero_cta: false,
      hero_cta_text: 'Cook now',
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
