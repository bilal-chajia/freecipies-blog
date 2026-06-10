import type { StoredImageVariants } from '@shared/types/images';
import type { CachedCardJson } from '../../articles/types/cache.types';
import type { FeaturedArticleImage, FeaturedArticleSnapshot } from '../types/presentation.types';

/**
 * Minimal card-cache fields the snapshot needs. Structural so both the stored
 * CachedCardJson (reader side) and the freshly built card payload (writer side
 * in syncCachedFields) are accepted.
 */
export type FeaturedCardSource = Pick<CachedCardJson, 'id' | 'slug' | 'headline' | 'image'>;

/**
 * Build the stored featured-article snapshot from the article's card cache.
 * Per IMAGE_JSON_CONTRACT this is a STORED snapshot: image variants keep
 * `r2_key` (mirroring cached_card_json.image); the API/render boundary
 * resolves them to public URLs. Never copy `caption`, `credit`, or `original`.
 */
export function buildFeaturedArticleSnapshot(card: FeaturedCardSource): FeaturedArticleSnapshot {
  const image = buildSnapshotImage(card.image);

  return {
    id: card.id,
    slug: card.slug,
    title: card.headline,
    ...(image ? { image } : {}),
  };
}

function buildSnapshotImage(image: CachedCardJson['image']): FeaturedArticleImage | undefined {
  if (!image || typeof image !== 'object') return undefined;

  const variants: FeaturedArticleImage['variants'] = {};
  const source: StoredImageVariants =
    image.variants && typeof image.variants === 'object' ? image.variants : {};
  for (const key of ['xs', 'sm', 'md', 'lg'] as const) {
    const variant = source[key];
    if (variant) variants[key] = variant;
  }
  if (Object.keys(variants).length === 0) return undefined;

  return {
    ...(typeof image.media_id === 'number' ? { media_id: image.media_id } : {}),
    alt: typeof image.alt === 'string' ? image.alt : '',
    ...(typeof image.placeholder === 'string' && image.placeholder
      ? { placeholder: image.placeholder }
      : {}),
    ...(typeof image.aspect_ratio === 'string' ? { aspect_ratio: image.aspect_ratio } : {}),
    ...(image.focal_point && typeof image.focal_point === 'object'
      ? { focal_point: image.focal_point }
      : {}),
    variants,
  };
}

/**
 * Enrich a normalized presentation_json at category save time: when the client
 * selected a featured article (id), build the stored snapshot server-side from
 * the article's cached_card_json. Drops the featured_article when the article
 * cannot be resolved (unknown id, unpublished, deleted).
 */
export async function enrichPresentationFeatured(
  presentationJson: string,
  cardLookup: (articleId: number) => Promise<FeaturedCardSource | null>,
): Promise<string> {
  let presentation: Record<string, unknown>;
  try {
    presentation = JSON.parse(presentationJson);
  } catch {
    return '{}';
  }
  if (!presentation || typeof presentation !== 'object') return '{}';

  const featured = presentation.featured_article as { id?: unknown } | null | undefined;
  if (!featured || typeof featured !== 'object' || typeof featured.id !== 'number') {
    delete presentation.featured_article;
    return JSON.stringify(presentation);
  }

  const card = await cardLookup(featured.id);
  if (card) {
    presentation.featured_article = buildFeaturedArticleSnapshot(card);
  } else {
    delete presentation.featured_article;
  }

  return JSON.stringify(presentation);
}

/**
 * Resync a category's presentation_json after its featured source article changed.
 * Returns the updated JSON string when a write is needed, or null when nothing changes.
 * Pass `card = null` when the article is deleted/unpublished: the snapshot is cleared
 * (the site falls back to the first article of the list).
 */
export function resyncPresentationFeatured(
  presentationJson: string | null | undefined,
  articleId: number,
  card: FeaturedCardSource | null,
): string | null {
  if (!presentationJson) return null;

  let presentation: Record<string, unknown>;
  try {
    presentation = JSON.parse(presentationJson);
  } catch {
    return null;
  }
  if (!presentation || typeof presentation !== 'object') return null;

  const featured = presentation.featured_article as { id?: unknown } | null | undefined;
  if (!featured || typeof featured !== 'object' || featured.id !== articleId) return null;

  if (card) {
    presentation.featured_article = buildFeaturedArticleSnapshot(card);
  } else {
    delete presentation.featured_article;
  }

  const updated = JSON.stringify(presentation);
  return updated === presentationJson ? null : updated;
}
