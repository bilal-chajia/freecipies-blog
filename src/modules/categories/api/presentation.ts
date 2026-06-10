import type { StoredImageVariant, StoredImageVariants } from '@shared/types/images';
import type {
  CategoryPresentation,
  FeaturedArticleImage,
  FeaturedArticleSnapshot,
  HeroCta,
} from '../types/presentation.types';

const VARIANT_KEYS = ['xs', 'sm', 'md', 'lg'] as const;

function normalizeStoredVariant(value: unknown): StoredImageVariant | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.r2_key !== 'string' || !v.r2_key) return undefined;
  if (typeof v.width !== 'number' || typeof v.height !== 'number') return undefined;
  return {
    r2_key: v.r2_key,
    width: v.width,
    height: v.height,
    ...(typeof v.size_bytes === 'number' ? { size_bytes: v.size_bytes } : {}),
  };
}

function normalizeFeaturedImage(value: unknown): FeaturedArticleImage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;

  const variants: StoredImageVariants = {};
  const source = v.variants && typeof v.variants === 'object'
    ? (v.variants as Record<string, unknown>)
    : {};
  for (const key of VARIANT_KEYS) {
    const variant = normalizeStoredVariant(source[key]);
    if (variant) variants[key] = variant;
  }
  if (Object.keys(variants).length === 0) return undefined;

  return {
    ...(typeof v.media_id === 'number' ? { media_id: v.media_id } : {}),
    alt: typeof v.alt === 'string' ? v.alt : '',
    ...(typeof v.placeholder === 'string' && v.placeholder ? { placeholder: v.placeholder } : {}),
    ...(typeof v.aspect_ratio === 'string' ? { aspect_ratio: v.aspect_ratio } : {}),
    ...(v.focal_point && typeof v.focal_point === 'object'
      ? { focal_point: v.focal_point as { x: number; y: number } }
      : {}),
    variants,
  };
}

function normalizeFeaturedArticle(value: unknown): FeaturedArticleSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'number' || typeof v.slug !== 'string' || typeof v.title !== 'string') {
    return undefined;
  }
  const snapshot: FeaturedArticleSnapshot = { id: v.id, slug: v.slug, title: v.title };
  // Only a contract-shaped stored image (r2_key variants) survives normalization.
  // Client-sent resolved images (url) are dropped: the server rebuilds the
  // snapshot from the article's cached_card_json at save time.
  const image = normalizeFeaturedImage(v.image);
  if (image) snapshot.image = image;
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
