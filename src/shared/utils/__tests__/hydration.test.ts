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
