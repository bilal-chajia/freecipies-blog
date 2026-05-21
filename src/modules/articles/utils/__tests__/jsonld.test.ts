import { describe, expect, it } from 'vitest';
import { generateJsonLd } from '../jsonld';

describe('generateJsonLd', () => {
  it('includes BreadcrumbList in cached article JSON-LD output', () => {
    const schemas = generateJsonLd({
      id: 1,
      type: 'article',
      headline: 'Kitchen Basics',
      slug: 'kitchen-basics',
      shortDescription: 'Useful kitchen basics.',
      publishedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
      cachedAuthorJson: JSON.stringify({ name: 'Jane Doe', slug: 'jane-doe' }),
      cachedCategoryJson: JSON.stringify({ label: 'Guides', slug: 'guides' }),
    }, 'https://example.com');

    expect(schemas.some((schema) => schema['@type'] === 'Article')).toBe(true);
    expect(schemas).toContainEqual(expect.objectContaining({
      '@type': 'BreadcrumbList',
      itemListElement: expect.arrayContaining([
        expect.objectContaining({ position: 1, name: 'Home', item: 'https://example.com' }),
        expect.objectContaining({ position: 2, name: 'Guides', item: 'https://example.com/categories/guides' }),
        expect.objectContaining({ position: 3, name: 'Kitchen Basics' }),
      ]),
    }));
  });

  it('includes the collection crumb before category for recipes', () => {
    const schemas = generateJsonLd({
      id: 2,
      type: 'recipe',
      headline: 'Avocado Toast',
      slug: 'avocado-toast',
      shortDescription: 'Quick breakfast.',
      recipeJson: JSON.stringify({ prep: 5, cook: 0, ingredients: [], instructions: [] }),
      imagesJson: '{}',
      cachedAuthorJson: JSON.stringify({ name: 'Jane Doe' }),
      cachedCategoryJson: JSON.stringify({ label: 'Breakfast', slug: 'breakfast' }),
    }, 'https://example.com');

    const breadcrumb = schemas.find((schema) => schema['@type'] === 'BreadcrumbList');
    expect(breadcrumb?.itemListElement).toEqual(expect.arrayContaining([
      expect.objectContaining({ position: 2, name: 'Recipes', item: 'https://example.com/recipes' }),
      expect.objectContaining({ position: 3, name: 'Breakfast', item: 'https://example.com/categories/breakfast' }),
      expect.objectContaining({ position: 4, name: 'Avocado Toast' }),
    ]));
  });
});
