import { describe, expect, it } from 'vitest';
import { normalizePresentation, parsePresentationJson } from '../presentation';

describe('normalizePresentation', () => {
  it('returns empty object for null/invalid/non-object', () => {
    expect(normalizePresentation(null)).toEqual({});
    expect(normalizePresentation('nope')).toEqual({});
    expect(normalizePresentation(123)).toEqual({});
  });

  it('keeps a valid featured_article snapshot and strips r2_key from its image', () => {
    const result = normalizePresentation({
      featured_article: {
        id: 7,
        slug: 'pie',
        title: 'Pie',
        image: { url: '/api/images/pie.webp', alt: 'Pie', width: 800, height: 600, r2_key: 'media/pie.webp' },
      },
      tldr: 'Sweet',
      hero_cta: { show: true, text: 'Cook', link: '/r/pie' },
    });
    expect(result.featured_article).toEqual({
      id: 7,
      slug: 'pie',
      title: 'Pie',
      image: { url: '/api/images/pie.webp', alt: 'Pie', width: 800, height: 600 },
    });
    expect(result.tldr).toBe('Sweet');
    expect(result.hero_cta).toEqual({ show: true, text: 'Cook', link: '/r/pie' });
  });

  it('drops a featured_article missing required id/slug/title', () => {
    expect(normalizePresentation({ featured_article: { id: 1 } }).featured_article).toBeUndefined();
  });

  it('ignores camelCase aliases', () => {
    const result = normalizePresentation({ heroCta: { show: true }, featuredArticle: { id: 1, slug: 'x', title: 'X' } });
    expect(result.hero_cta).toBeUndefined();
    expect(result.featured_article).toBeUndefined();
  });
});

describe('parsePresentationJson', () => {
  it('returns "{}" for empty input', () => {
    expect(parsePresentationJson(undefined)).toBe('{}');
    expect(parsePresentationJson('')).toBe('{}');
  });

  it('parses a JSON string and re-serializes the normalized object', () => {
    const out = parsePresentationJson(JSON.stringify({ tldr: 'Hi', extra: 'drop' }));
    expect(JSON.parse(out)).toEqual({ tldr: 'Hi' });
  });
});
