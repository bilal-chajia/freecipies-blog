import type { CategoryPageSettings } from '../../settings/types/settings.types';
import { HERO_CTA_DEFAULT } from '../types/presentation.types';
import type { CategoryPresentation, FeaturedArticleSnapshot, HeroCta } from '../types/presentation.types';

export interface EffectiveCategoryPage extends CategoryPageSettings {
  featured_article: FeaturedArticleSnapshot | null;
  tldr: string;
  hero_cta: HeroCta;
}

/**
 * Combine global page settings with per-category editorial content.
 * Global provides the uniform base; presentation overlays editorial fields only.
 */
export function mergeEffectiveCategorySettings(
  global: CategoryPageSettings,
  presentation: CategoryPresentation,
): EffectiveCategoryPage {
  return {
    ...global,
    featured_article: presentation.featured_article ?? null,
    tldr: presentation.tldr ?? '',
    hero_cta: presentation.hero_cta ?? HERO_CTA_DEFAULT,
  };
}
