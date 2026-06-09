import type { CategoryPresentation, FeaturedArticleSnapshot, HeroCta } from '../types/presentation.types';

function normalizeFeaturedArticle(value: unknown): FeaturedArticleSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'number' || typeof v.slug !== 'string' || typeof v.title !== 'string') {
    return undefined;
  }
  const snapshot: FeaturedArticleSnapshot = { id: v.id, slug: v.slug, title: v.title };
  const img = v.image;
  if (img && typeof img === 'object') {
    const i = img as Record<string, unknown>;
    if (typeof i.url === 'string') {
      snapshot.image = {
        url: i.url,
        alt: typeof i.alt === 'string' ? i.alt : '',
        ...(typeof i.width === 'number' ? { width: i.width } : {}),
        ...(typeof i.height === 'number' ? { height: i.height } : {}),
      };
    }
  }
  return snapshot;
}

function normalizeHeroCta(value: unknown): HeroCta | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  return {
    show: typeof v.show === 'boolean' ? v.show : false,
    text: typeof v.text === 'string' ? v.text : '',
    link: typeof v.link === 'string' ? v.link : '',
  };
}

export function normalizePresentation(input: unknown): CategoryPresentation {
  if (!input || typeof input !== 'object') return {};
  const v = input as Record<string, unknown>;
  const result: CategoryPresentation = {};

  const featured = normalizeFeaturedArticle(v.featured_article);
  if (featured) result.featured_article = featured;

  if (typeof v.tldr === 'string') result.tldr = v.tldr;

  const cta = normalizeHeroCta(v.hero_cta);
  if (cta) result.hero_cta = cta;

  return result;
}

export function parsePresentationJson(value: unknown): string {
  if (!value) return '{}';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(normalizePresentation(JSON.parse(value)));
    } catch {
      return '{}';
    }
  }
  if (typeof value === 'object') {
    return JSON.stringify(normalizePresentation(value));
  }
  return '{}';
}
