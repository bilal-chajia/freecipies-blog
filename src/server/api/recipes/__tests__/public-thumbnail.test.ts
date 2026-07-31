import { describe, expect, it } from 'vitest';
import {
  resolvePublicRecipeAuthor,
  resolvePublicRecipeCategory,
  resolvePublicRecipeThumbnail,
} from '../public-thumbnail';

describe('resolvePublicRecipeThumbnail', () => {
  it('returns a public thumbnail without exposing its R2 storage key', () => {
    const imagesJson = JSON.stringify({
      thumbnail: {
        alt: 'Chocolate cake',
        variants: {
          sm: {
            r2_key: 'recipes/chocolate-cake-sm.webp',
            width: 720,
            height: 480,
          },
        },
      },
    });

    const thumbnail = resolvePublicRecipeThumbnail(imagesJson, 'Fallback title');

    expect(thumbnail).toEqual({
      url: '/api/images/recipes/chocolate-cake-sm.webp',
      width: 720,
      height: 480,
      alt: 'Chocolate cake',
    });
    expect(JSON.stringify(thumbnail)).not.toContain('r2_key');
  });

  it('falls back to the hero slot and headline alt text', () => {
    const imagesJson = JSON.stringify({
      hero: {
        variants: {
          sm: {
            r2_key: 'recipes/pasta-hero-sm.webp',
            width: 720,
            height: 540,
          },
        },
      },
    });

    expect(resolvePublicRecipeThumbnail(imagesJson, 'Creamy pasta')).toEqual({
      url: '/api/images/recipes/pasta-hero-sm.webp',
      width: 720,
      height: 540,
      alt: 'Creamy pasta',
    });
  });

  it('returns null when no usable public image exists', () => {
    expect(resolvePublicRecipeThumbnail(null, 'Recipe')).toBeNull();
  });
});

describe('public recipe references', () => {
  it('keeps only public author fields and removes stored image snapshots', () => {
    const author = resolvePublicRecipeAuthor({
      name: 'John Baker',
      slug: 'john-baker',
      role: 'Pastry Chef',
      avatar_url: '/api/images/avatar.webp',
      avatar: {
        variants: {
          sm: { r2_key: 'private/avatar.webp', width: 100, height: 100 },
        },
      },
    });

    expect(author).toEqual({
      name: 'John Baker',
      slug: 'john-baker',
      role: 'Pastry Chef',
      avatar_url: '/api/images/avatar.webp',
    });
    expect(JSON.stringify(author)).not.toContain('r2_key');
  });

  it('keeps only the public category card fields', () => {
    expect(resolvePublicRecipeCategory({
      label: 'Breakfast',
      slug: 'breakfast',
      color: '#407513',
      thumbnail: { variants: { sm: { r2_key: 'private/category.webp' } } },
    })).toEqual({
      label: 'Breakfast',
      slug: 'breakfast',
      color: '#407513',
    });
  });
});
