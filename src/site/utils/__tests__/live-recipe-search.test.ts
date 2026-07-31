import { describe, expect, it } from 'vitest';
import {
  buildLiveRecipeSearchUrl,
  canApplyLiveRecipeSearchResponse,
  normalizeLiveRecipeSearch,
} from '../live-recipe-search';

describe('live recipe search', () => {
  it('normalizes a query before it reaches the API', () => {
    expect(normalizeLiveRecipeSearch('  chocolate   cake  ')).toBe('chocolate cake');
  });

  it('does not create a request for an empty query', () => {
    expect(buildLiveRecipeSearchUrl('   ')).toBeNull();
  });

  it('creates a bounded encoded API request for a normalized query', () => {
    expect(buildLiveRecipeSearchUrl('chocolate & cake')).toBe(
      '/api/recipes?search=chocolate+%26+cake&limit=100&view=live_search',
    );
  });

  it('rejects a response that belongs to an older query', () => {
    expect(canApplyLiveRecipeSearchResponse('pasta', 'pas')).toBe(false);
    expect(canApplyLiveRecipeSearchResponse('pasta', 'pasta')).toBe(true);
  });
});
