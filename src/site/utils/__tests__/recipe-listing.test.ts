import { describe, expect, it } from 'vitest';
import { buildRecipeListingUrl, normalizeRecipeSearch } from '../recipe-listing';

describe('normalizeRecipeSearch', () => {
  it('trims a search term and converts blank input to an empty string', () => {
    expect(normalizeRecipeSearch('  lemon cake  ')).toBe('lemon cake');
    expect(normalizeRecipeSearch('   ')).toBe('');
    expect(normalizeRecipeSearch(null)).toBe('');
  });
});

describe('buildRecipeListingUrl', () => {
  it('preserves search with category, tag, and pagination', () => {
    expect(
      buildRecipeListingUrl({
        category: 'dinner',
        tag: 'quick',
        search: 'lemon cake',
        page: 3,
      }),
    ).toBe('/recipes?category=dinner&tag=quick&search=lemon+cake&page=3');
  });

  it('omits blank filters and page one', () => {
    expect(buildRecipeListingUrl({ search: '   ', page: 1 })).toBe('/recipes');
  });
});
