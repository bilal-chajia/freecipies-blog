/**
 * Completeness guard for the draft → published transition.
 *
 * Returns a list of human-readable reasons the article is NOT publishable
 * (empty list = publishable). This is the COMPLETENESS counterpart to the
 * STRUCTURAL save-time `*JsonInputSchema` gates, which deliberately accept
 * incomplete drafts.
 *
 * Criteria (product-confirmed): non-empty headline + slug and a hero image for
 * every type; plus per-type body completeness (article body blocks, recipe
 * ingredients + instructions, roundup items).
 *
 * Pure function: no DB, no Cloudflare bindings — safe under the domain-only
 * module boundary. Accepts both raw JSON strings and already-parsed objects
 * (the `getArticleById` row mixes both).
 *
 * @see docs/superpowers/plans/2026-06-13-cms-followups-validation-and-publish-guard.md
 */
type PublishCheckInput = {
  type?: string | null;
  headline?: string | null;
  slug?: string | null;
  content_json?: unknown;
  recipe_json?: unknown;
  roundup_json?: unknown;
  images_json?: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function arrayLen(obj: Record<string, unknown> | null, key: string): number {
  const v = obj?.[key];
  return Array.isArray(v) ? v.length : 0;
}

function hasHeroImage(imagesJson: unknown): boolean {
  const images = asObject(imagesJson);
  const hero = images ? asObject(images.hero) : null;
  if (!hero) return false;
  // A real hero carries an identifying reference: pre-resolution (r2_key/url)
  // or post-resolution (variants/media_id). An empty {} placeholder does not.
  return 'media_id' in hero || 'r2_key' in hero || 'url' in hero || 'variants' in hero;
}

export function checkPublishCompleteness(article: PublishCheckInput): string[] {
  const issues: string[] = [];

  if (!article.headline || !article.headline.trim()) issues.push('A headline is required to publish.');
  if (!article.slug || !article.slug.trim()) issues.push('A slug is required to publish.');
  if (!hasHeroImage(article.images_json)) issues.push('A hero image is required to publish.');

  const type = article.type ?? 'article';

  if (type === 'recipe') {
    const recipe = asObject(article.recipe_json);
    if (!recipe) issues.push('Recipe data is missing or invalid.');
    else {
      if (arrayLen(recipe, 'ingredients') < 1) issues.push('At least one ingredient is required.');
      if (arrayLen(recipe, 'instructions') < 1) issues.push('At least one instruction step is required.');
    }
  } else if (type === 'roundup') {
    const roundup = asObject(article.roundup_json);
    if (!roundup || arrayLen(roundup, 'items') < 1) issues.push('A roundup must have at least one item.');
  } else {
    const content = asObject(article.content_json);
    if (!content || arrayLen(content, 'blocks') < 1) issues.push('Article body must have at least one content block.');
  }

  return issues;
}
