import { describe, expect, it, vi } from 'vitest';
import {
  type CachedCardFields,
  parseJsonLdArray,
  parseCachedCard,
  parseCachedRecipe,
  parseCachedRating,
  parseCachedToc,
  getReadingTimeDisplay,
  cleanCardImages,
} from '../cached-fields';

describe('cached-fields helpers', () => {
  describe('parseJsonLdArray', () => {
    it('returns empty array on null/undefined/empty string', () => {
      expect(parseJsonLdArray(null)).toEqual([]);
      expect(parseJsonLdArray(undefined)).toEqual([]);
      expect(parseJsonLdArray('')).toEqual([]);
    });

    it('returns empty array when input is empty JSON object "{}"', () => {
      expect(parseJsonLdArray('{}')).toEqual([]);
      expect(parseJsonLdArray({})).toEqual([]);
    });

    it('returns empty array when input is a non-array object', () => {
      const obj = { '@context': 'https://schema.org', '@type': 'Recipe' };
      expect(parseJsonLdArray(obj)).toEqual([]);
      expect(parseJsonLdArray(JSON.stringify(obj))).toEqual([]);
    });

    it('returns array unchanged if already array', () => {
      const arr = [{ '@type': 'Recipe' }, { '@type': 'BreadcrumbList' }];
      expect(parseJsonLdArray(arr)).toEqual(arr);
      expect(parseJsonLdArray(JSON.stringify(arr))).toEqual(arr);
    });

    it('returns empty array on parsing failure', () => {
      expect(parseJsonLdArray('{invalid json')).toEqual([]);
    });
  });

  describe('getReadingTimeDisplay', () => {
    it('prefers reading_time_minutes or reading_time_minutes when present', () => {
      expect(getReadingTimeDisplay({ reading_time_minutes: 8 })).toBe(8);
      expect(getReadingTimeDisplay({ reading_time_minutes: 12 })).toBe(12);
    });

    it('uses fallback of 5 for recipe and 3 for article/roundup and prints a warning on drift', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(getReadingTimeDisplay({ type: 'recipe', slug: 'test-recipe' })).toBe(5);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockClear();
      expect(getReadingTimeDisplay({ type: 'article', id: 42 })).toBe(3);
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });
  });

  describe('cleanCardImages', () => {
    it('cleans image slot and author avatar, converting r2Key or r2_key to URL and deleting raw keys', () => {
      const card: CachedCardFields = {
        headline: 'Clean Card Test',
        image: {
          alt: 'Test Alt',
          variants: {
            xs: { r2_key: 'avatar_xs.jpg', width: 100, height: 100 },
            sm: { r2Key: 'avatar_sm.jpg', width: 200, height: 200, url: '/cached-url.jpg' },
          },
        },
        author: {
          name: 'Author Name',
          avatar: {
            variants: {
              xs: { r2_key: 'author_xs.jpg', width: 50, height: 50 },
            },
          },
        },
      };

      const cleaned = cleanCardImages(card);
      expect(cleaned.image?.variants?.xs?.url).toBe('/api/images/avatar_xs.jpg');
      expect(cleaned.image?.variants?.xs?.r2_key).toBeUndefined();

      expect(cleaned.image?.variants?.sm?.url).toBe('/api/images/avatar_sm.jpg');
      expect(cleaned.image?.variants?.sm?.r2Key).toBeUndefined();

      expect(cleaned.author?.avatar?.variants?.xs?.url).toBe('/api/images/author_xs.jpg');
      expect(cleaned.author?.avatar?.variants?.xs?.r2_key).toBeUndefined();
    });

    it('handles cards without image or author cleanly', () => {
      const minimalCard = { headline: 'Minimal Card' };
      expect(cleanCardImages(minimalCard)).toEqual(minimalCard);
    });
  });
});
