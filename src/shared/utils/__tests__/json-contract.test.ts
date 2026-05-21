import { describe, expect, it } from 'vitest';
import {
  parseJsonObject,
  stringifySnakeCaseJson,
  toSnakeCaseJson,
  toSnakeCaseKey,
} from '../json-contract';

describe('json contract helpers', () => {
  it('converts keys to snake_case recursively', () => {
    expect(toSnakeCaseJson({
      recipeYield: '4 servings',
      aggregateRating: {
        ratingValue: 4.8,
        ratingCount: 12,
      },
      items: [
        { articleId: 42, externalUrl: null },
      ],
    })).toEqual({
      recipe_yield: '4 servings',
      aggregate_rating: {
        rating_value: 4.8,
        rating_count: 12,
      },
      items: [
        { article_id: 42, external_url: null },
      ],
    });
  });

  it('keeps already snake_case keys stable', () => {
    expect(toSnakeCaseKey('size_bytes')).toBe('size_bytes');
    expect(toSnakeCaseKey('r2_key')).toBe('r2_key');
  });

  it('stringifies normalized JSON', () => {
    expect(stringifySnakeCaseJson({ sizeBytes: 123, nestedValue: true }))
      .toBe('{"size_bytes":123,"nested_value":true}');
  });

  it('parses only JSON objects', () => {
    expect(parseJsonObject('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonObject('[1,2]')).toBeNull();
    expect(parseJsonObject('bad')).toBeNull();
  });
});

