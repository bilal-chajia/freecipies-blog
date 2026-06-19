import { describe, it, expect } from 'vitest';
import { mapArticleToRecipeRef, mapArticleToRoundupRef, addRecipeRef, addRoundupRef } from '../ref-mappers';

describe('ref mappers', () => {
  it('maps an article to a recipe ref (snake_case, route /recipes)', () => {
    const ref = mapArticleToRecipeRef({ id: 12, title: 'Pasta', slug: 'pasta' });
    expect(ref).toEqual({ article_id: 12, headline: 'Pasta', route: '/recipes/pasta' });
  });

  it('maps an article to a roundup ref (snake_case, route /roundups)', () => {
    const ref = mapArticleToRoundupRef({ id: 5, title: 'Best Soups', slug: 'best-soups' });
    expect(ref).toEqual({ roundup_id: 5, title: 'Best Soups', route: '/roundups/best-soups' });
  });

  it('refuses a duplicate recipe ref by article_id', () => {
    const existing = [{ article_id: 7, headline: 'A', route: '/recipes/a' }];
    expect(addRecipeRef(existing, { article_id: 7, headline: 'dup', route: '/recipes/dup' })).toEqual(existing);
  });

  it('appends a new recipe ref', () => {
    const existing = [{ article_id: 7, headline: 'A', route: '/recipes/a' }];
    const next = addRecipeRef(existing, { article_id: 9, headline: 'B', route: '/recipes/b' });
    expect(next).toHaveLength(2);
    expect(next[1].article_id).toBe(9);
  });

  it('refuses a duplicate roundup ref by roundup_id', () => {
    const existing = [{ roundup_id: 3, title: 'X', route: '/roundups/x' }];
    expect(addRoundupRef(existing, { roundup_id: 3, title: 'dup', route: '/roundups/dup' })).toEqual(existing);
  });

  it('appends a new roundup ref', () => {
    const existing = [{ roundup_id: 3, title: 'X', route: '/roundups/x' }];
    const next = addRoundupRef(existing, { roundup_id: 4, title: 'Y', route: '/roundups/y' });
    expect(next).toHaveLength(2);
    expect(next[1].roundup_id).toBe(4);
  });
});
