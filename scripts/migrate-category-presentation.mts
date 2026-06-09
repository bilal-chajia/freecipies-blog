/**
 * One-shot: build categories.presentation_json from legacy config_json fields.
 * Best-effort. Run against prod D1 at deploy: `pnpm tsx scripts/migrate-category-presentation.mts`.
 * The DB-wiring section is intentionally minimal; the pure transform below is unit-tested.
 */
import { buildFeaturedArticleSnapshot } from '../src/modules/categories/snapshot/featured-article';
import type { CachedCardJson } from '../src/modules/articles/types/cache.types';
import type { CategoryPresentation } from '../src/modules/categories/types/presentation.types';

type CardLookup = (id: number) => Promise<CachedCardJson | null>;

export async function buildPresentationFromLegacy(
  legacy: Record<string, unknown>,
  cardLookup: CardLookup,
): Promise<CategoryPresentation> {
  const result: CategoryPresentation = {};

  if (typeof legacy.tldr === 'string' && legacy.tldr.length > 0) {
    result.tldr = legacy.tldr;
  }

  const id = typeof legacy.featured_article_id === 'number' ? legacy.featured_article_id : undefined;
  if (id !== undefined) {
    const card = await cardLookup(id);
    if (card) result.featured_article = buildFeaturedArticleSnapshot(card);
  }

  return result;
}

// DB wiring (only runs when executed directly, not under test import).
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Run the snapshot backfill against D1 here (manual deploy step).');
}
