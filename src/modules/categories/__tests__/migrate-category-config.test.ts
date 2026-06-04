import { describe, it, expect } from 'vitest';
import { migrateCategoryConfig } from '../../../../scripts/migrate-category-config.mts';

describe('migrateCategoryConfig', () => {
  it('remaps camelCase keys and the sortBy value to canonical snake_case', () => {
    const legacy = {
      postsPerPage: 12,
      tldr: 'hi',
      showInNav: true,
      layout: 'masonry',
      cardStyle: 'full',
      sortBy: 'publishedAt',
      featuredArticleId: 2,
      showHeroCta: true,
      heroCtaText: 'get recipes',
    };
    expect(migrateCategoryConfig(legacy)).toEqual({
      posts_per_page: 12,
      tldr: 'hi',
      show_in_nav: true,
      layout_mode: 'masonry',
      card_style: 'full',
      article_sort_by: 'published_at',
      featured_article_id: 2,
      show_hero_cta: true,
      hero_cta_text: 'get recipes',
    });
  });

  it('is idempotent on already-snake_case config', () => {
    const snake = { posts_per_page: 6, layout_mode: 'grid', article_sort_by: 'view_count' };
    expect(migrateCategoryConfig(snake)).toEqual(snake);
  });

  it('returns {} for non-object input', () => {
    expect(migrateCategoryConfig(null)).toEqual({});
    expect(migrateCategoryConfig('x')).toEqual({});
  });
});
