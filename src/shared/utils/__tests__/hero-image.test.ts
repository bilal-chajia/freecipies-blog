import { describe, it, expect } from 'vitest';
import { resolveHeroImage } from '../hero-image';

const withVariants = {
  hero: {
    alt: 'Hero alt',
    variants: {
      md: { url: 'https://img/hero-md.jpg', width: 800, height: 600 },
      lg: { url: 'https://img/hero-lg.jpg', width: 1200, height: 900 },
    },
  },
  thumbnail: {
    alt: 'Thumb alt',
    variants: {
      sm: { url: 'https://img/thumb-sm.jpg', width: 400, height: 300 },
    },
  },
};

describe('resolveHeroImage', () => {
  it('prefers hero when it has variants (srcset available)', () => {
    const result = resolveHeroImage(JSON.stringify(withVariants), 1200);
    expect(result.slot).toBe('hero');
    expect(result.image.image_url).toBe('https://img/hero-lg.jpg');
    expect(result.srcSet).toContain('hero-md.jpg 800w');
    expect(result.srcSet).toContain('hero-lg.jpg 1200w');
  });

  it('falls back to thumbnail when hero is missing', () => {
    const images = JSON.stringify({ thumbnail: withVariants.thumbnail });
    const result = resolveHeroImage(images, 1200);
    expect(result.slot).toBe('thumbnail');
    expect(result.image.image_url).toBe('https://img/thumb-sm.jpg');
  });

  it('uses hero without variants when no thumbnail exists', () => {
    const images = JSON.stringify({
      hero: { alt: 'h', variants: { original: { url: 'https://img/hero.jpg', width: 1200, height: 800 } } },
    });
    const result = resolveHeroImage(images, 1200);
    expect(result.slot).toBe('hero');
    expect(result.image.image_url).toBe('https://img/hero.jpg');
  });

  it('prefers thumbnail when hero has no srcset and thumbnail exists', () => {
    const images = JSON.stringify({
      hero: { alt: 'h', variants: { original: { url: 'https://img/hero.jpg', width: 1200, height: 800 } } },
      thumbnail: withVariants.thumbnail,
    });
    const result = resolveHeroImage(images, 1200);
    expect(result.slot).toBe('thumbnail');
  });

  it('returns empty image for null/invalid input', () => {
    expect(resolveHeroImage(null).image.image_url).toBeUndefined();
    expect(resolveHeroImage('not json').image.image_url).toBeUndefined();
    expect(resolveHeroImage('{}').srcSet).toBe('');
  });
});
