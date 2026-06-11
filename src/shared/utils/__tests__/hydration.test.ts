import { describe, expect, it } from 'vitest';
import { hydrateArticle, hydrateAuthor } from '../hydration';

describe('hydration SEO extraction', () => {
  it('hydrates article SEO from snake_case seo_json', () => {
    const article = hydrateArticle({
      slug: 'test-recipe',
      seo_json: JSON.stringify({
        meta_title: 'Snake title',
        meta_description: 'Snake description',
        og_image: '/og.webp',
        canonical: '/recipes/test-recipe',
      }),
    });

    expect(article.metaTitle).toBe('Snake title');
    expect(article.metaDescription).toBe('Snake description');
    expect(article.ogImage).toBe('/og.webp');
    expect(article.canonical).toBe('/recipes/test-recipe');
  });

  it('hydrates author SEO from snake_case seo_json', () => {
    const author = hydrateAuthor({
      slug: 'chef-test',
      seo_json: JSON.stringify({
        meta_title: 'Chef title',
        meta_description: 'Chef description',
      }),
    });

    expect(author.metaTitle).toBe('Chef title');
    expect(author.metaDescription).toBe('Chef description');
  });
});

describe('hydration author/category nested shape', () => {
  it('exposes nested snake_case author/category from cached_*_json', () => {
    const article = hydrateArticle({
      slug: 'cached-recipe',
      type: 'recipe',
      headline: 'Cached Recipe',
      cached_category_json: JSON.stringify({ id: 3, label: 'Desserts', color: '#ff6600', slug: 'desserts' }),
      cached_author_json: JSON.stringify({ id: 7, name: 'Jane Doe', slug: 'jane-doe', job_title: 'Pastry Chef' }),
    });

    expect(article.category).toMatchObject({ label: 'Desserts', color: '#ff6600', slug: 'desserts' });
    expect(article.author).toMatchObject({ name: 'Jane Doe', slug: 'jane-doe', role: 'Pastry Chef' });
  });

  it('builds nested objects from join aliases when cached_*_json is absent', () => {
    const article = hydrateArticle({
      slug: 'joined-recipe',
      type: 'recipe',
      headline: 'Joined Recipe',
      categoryLabel: 'Dinner',
      categoryColor: '#123456',
      categorySlug: 'dinner',
      authorName: 'John Roe',
      authorSlug: 'john-roe',
      authorJob: 'Cook',
    });

    expect(article.category).toMatchObject({ label: 'Dinner', color: '#123456', slug: 'dinner' });
    expect(article.author).toMatchObject({ name: 'John Roe', slug: 'john-roe', role: 'Cook' });
  });

  it('does not emit flat camelCase author/category aliases', () => {
    const result = hydrateArticle({
      slug: 'no-flat',
      type: 'article',
      headline: 'No Flat Aliases',
      cached_category_json: JSON.stringify({ id: 1, label: 'News', color: '#000', slug: 'news' }),
      cached_author_json: JSON.stringify({ id: 2, name: 'A', slug: 'a', job_title: 'Writer' }),
    }) as Record<string, unknown>;

    expect(result.categoryLabel).toBeUndefined();
    expect(result.categoryColor).toBeUndefined();
    expect(result.categorySlug).toBeUndefined();
    expect(result.authorName).toBeUndefined();
    expect(result.authorSlug).toBeUndefined();
    expect(result.authorRole).toBeUndefined();
    expect(result.authorAvatar).toBeUndefined();
    expect(result.label).toBeUndefined();
  });
});
