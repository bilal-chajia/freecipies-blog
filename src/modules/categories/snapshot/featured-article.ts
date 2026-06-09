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
