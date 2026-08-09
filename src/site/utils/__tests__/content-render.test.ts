import { describe, expect, it } from 'vitest';
import { normalizeArticleForRender } from '@site/utils/content-render';

describe('normalizeArticleForRender', () => {
  it('preserves hydrated article fields used by the public recipe renderer', () => {
    const article = normalizeArticleForRender({
      id: 42,
      slug: 'summer-pasta',
      type: 'recipe',
      headline: 'Summer Pasta',
      short_description: 'A bright weeknight pasta.',
      content_json: { blocks: [] },
      recipe_json: { ingredients: [], instructions: [], equipment: [] },
      images_json: '{"hero":{"variants":{}}}',
      author: { name: 'Ada Lovelace', slug: 'ada-lovelace' },
      category: { label: 'Pasta', slug: 'pasta', color: '#f60' },
      view_count: 12,
    });

    expect(article).toMatchObject({
      id: 42,
      slug: 'summer-pasta',
      headline: 'Summer Pasta',
      author: { name: 'Ada Lovelace', slug: 'ada-lovelace' },
      category: { label: 'Pasta', slug: 'pasta', color: '#f60' },
      view_count: 12,
    });
    expect(article.recipe_json).toEqual({ ingredients: [], instructions: [], equipment: [] });
  });

  it('normalizes the sparse preview payload without discarding preview JSON', () => {
    const article = normalizeArticleForRender({
      id: 'preview',
      slug: 'preview',
      headline: 'Preview Title',
      short_description: 'Preview Description',
      recipe_json: '{"ingredients":[]}',
      content_json: { blocks: [] },
      images_json: '{"hero":{"url":"/preview.jpg"}}',
      author: { name: null, slug: null },
      category: { label: null, slug: null, color: null },
    });

    expect(article.type).toBe('recipe');
    expect(article.recipe_json).toBe('{"ingredients":[]}');
    expect(article.content_json).toEqual({ blocks: [] });
    expect(article.author).toBeNull();
    expect(article.category).toBeNull();
  });

  it('keeps form-derived preview relations when the separately fetched relations are null', () => {
    const article = normalizeArticleForRender(
      {
        id: 'preview',
        slug: 'preview',
        headline: 'Preview Title',
        short_description: 'Preview Description',
        author: { name: 'Preview Author', slug: 'preview-author' },
        category: { label: 'Preview Category', slug: 'preview-category', color: '#f60' },
      },
      { author: null, category: null },
    );

    expect(article.author).toMatchObject({ name: 'Preview Author', slug: 'preview-author' });
    expect(article.category).toMatchObject({ label: 'Preview Category', slug: 'preview-category' });
  });
});
