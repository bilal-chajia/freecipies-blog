import { describe, expect, it } from 'vitest';
import {
  buildAuthorCache,
  buildCategoryCache,
  buildTagsCache,
  buildRecipeCache,
  buildCardCache,
} from '../cache-builders';

describe('Cache Builders', () => {
  describe('buildAuthorCache', () => {
    it('returns null if author_id is missing', () => {
      expect(buildAuthorCache({ author_id: null } as any)).toBeNull();
    });

    it('successfully compiles author payload and extracts socials', () => {
      const bio_json = JSON.stringify({
        socials: [
          { network: 'pinterest', url: 'https://pinterest.com/test', label: 'Pinterest' },
          { network: 'instagram', url: 'https://instagram.com/test' },
          null,
        ],
      });
      const avatarJson = JSON.stringify({
        avatar: { variants: { xs: { r2_key: 'avatar.jpg' } } },
      });

      const res = buildAuthorCache({
        author_id: 42,
        authorName: 'Chef Bilal',
        authorSlug: 'chef-bilal',
        authorAvatar: avatarJson,
        authorRole: 'Head Chef',
        authorBio: 'Expert in SaaS architectures.',
        authorBioJson: bio_json,
      });

      expect(res).toEqual({
        id: 42,
        name: 'Chef Bilal',
        slug: 'chef-bilal',
        job_title: 'Head Chef',
        bio: 'Expert in SaaS architectures.',
        avatar: { variants: { xs: { r2_key: 'avatar.jpg' } } },
        social_links: [
          { network: 'pinterest', url: 'https://pinterest.com/test', label: 'Pinterest' },
          { network: 'instagram', url: 'https://instagram.com/test' },
        ],
      });
    });
  });

  describe('buildCategoryCache', () => {
    it('returns null if no ID present', () => {
      expect(buildCategoryCache({ category_id: null, category_id_value: null } as any)).toBeNull();
    });

    it('prefers category_id_value over category_id', () => {
      const res = buildCategoryCache({
        category_id: 10,
        category_id_value: 20,
        categoryLabel: 'Desserts',
        categorySlug: 'desserts',
        categoryColor: '#ff0000',
      });
      expect(res?.id).toBe(20);
      expect(res?.label).toBe('Desserts');
    });
  });

  describe('buildTagsCache', () => {
    it('maps hydrated tags to tag snapshots', () => {
      const tags = [
        { id: 1, label: 'Spicy', slug: 'spicy', color: 'red' },
        { id: 2, label: 'Easy', slug: 'easy', color: null },
      ];
      expect(buildTagsCache(tags as any)).toEqual([
        { id: 1, label: 'Spicy', slug: 'spicy', color: 'red' },
        { id: 2, label: 'Easy', slug: 'easy', color: null },
      ]);
    });
  });

  describe('buildRecipeCache', () => {
    it('returns null if article type is not recipe', () => {
      expect(buildRecipeCache('article', '{}')).toBeNull();
    });

    it('parses, normalizes, and derives recipe cache properties', () => {
      const recipe_json = JSON.stringify({
        prep: 10,
        cook: 20,
        difficulty: 'easy',
        ingredients: [],
        instructions: [],
      });
      const res = buildRecipeCache('recipe', recipe_json);
      expect(res).not.toBeNull();
      expect(res?.totalTimeMinutes).toBe(30);
      expect(res?.recipe_json).toContain('"difficulty":"easy"');
      expect(res?.cached_recipe_json).toHaveProperty('total_time_minutes', 30);
    });
  });

  describe('buildCardCache', () => {
    const cardInput = {
      id: 100,
      type: 'article',
      slug: 'test-article',
      headline: 'A Great Article',
      short_description: 'Article summary',
      images_json: null,
      reading_time_minutes: 5,
      roundup_json: null,
    };

    it('correctly compiles article card', () => {
      const res = buildCardCache(cardInput, {
        author: { id: 1, name: 'Chef', slug: 'chef', avatar: null, job_title: null, bio: null, social_links: [] },
        category: { id: 2, label: 'Food', slug: 'food', color: null },
        tags: [{ id: 3, label: 'Tag', slug: 'tag', color: null }],
        recipe: null,
        rating: null,
        totalTimeMinutes: null,
      });

      expect(res.id).toBe(100);
      expect(res.reading_time).toBe(5);
      expect(res.category?.label).toBe('Food');
      expect(res.author?.name).toBe('Chef');
      expect(res.tags).toHaveLength(1);
    });

    it('correctly compiles recipe card', () => {
      const res = buildCardCache(
        { ...cardInput, type: 'recipe' },
        {
          author: null,
          category: null,
          tags: [],
          recipe: { total_time_minutes: 15, difficulty: 'medium', calories_per_serving: 350, badges: { is_vegan: true } },
          rating: { rating_count: 5, rating_value: 4.8 },
          totalTimeMinutes: 15,
        }
      );

      expect(res.recipe?.difficulty).toBe('medium');
      expect(res.recipe?.calories_per_serving).toBe(350);
      expect(res.recipe?.badges?.is_vegan).toBe(true);
      expect(res.rating?.rating_value).toBe(4.8);
    });
  });
});
