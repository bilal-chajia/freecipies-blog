import { resolveVariantUrl } from '@shared/types/images';
import type { CachedCardJson } from '../../articles/types/cache.types';
import type { FeaturedArticleSnapshot } from '../types/presentation.types';

/**
 * Build a self-contained hero snapshot from an article card cache.
 * Resolves the best available image variant to a public URL; never stores r2_key.
 */
export function buildFeaturedArticleSnapshot(card: CachedCardJson): FeaturedArticleSnapshot {
  const v = card.image?.variants;
  const best = v?.lg ?? v?.md ?? v?.sm ?? v?.xs;
  const url = resolveVariantUrl(best ?? null);

  return {
    id: card.id,
    slug: card.slug,
    title: card.headline,
    ...(url
      ? {
          image: {
            url,
            alt: card.image?.alt ?? '',
            ...(typeof best?.width === 'number' ? { width: best.width } : {}),
            ...(typeof best?.height === 'number' ? { height: best.height } : {}),
          },
        }
      : {}),
  };
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
  card: CachedCardJson | null,
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
