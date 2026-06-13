/**
 * Structural save-time validation for `articles.roundup_json`.
 *
 * This is a STRUCTURAL guard, not a completeness guard: it rejects corrupted /
 * malformed payloads (items not an array, an item that is not an object, an
 * invalid source_type, a non-numeric article_id, etc.) while still accepting
 * incomplete drafts (most fields optional). Completeness — required content for a
 * publishable roundup — is a separate concern enforced at the publish transition.
 *
 * Deep server-resolved snapshot fields (image/recipe/rating/author/category) are
 * accepted loosely: they are produced by trusted write-time resolution, not by
 * the editor or AI, so over-constraining them here would risk false rejections.
 * Unknown keys pass through; `normalizeRoundupJson` does the canonical shaping.
 *
 * @see docs/ROUNDUP_JSON_CONTRACT.md
 */
import { z } from 'zod';

const roundupItemSchema = z
  .object({
    position: z.number().optional(),
    source_type: z.enum(['internal_recipe', 'external_recipe']).optional(),
    article_id: z.number().int().positive().optional(),
    slug: z.string().optional(),
    external_url: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    note: z.string().optional(),
    image: z.unknown().optional(),
    recipe: z.unknown().optional(),
    rating: z.unknown().optional(),
    author: z.unknown().optional(),
    category: z.unknown().optional(),
    tags: z.array(z.unknown()).optional(),
  })
  .passthrough();

const roundupObjectSchema = z
  .object({
    list_type: z.literal('ItemList').optional(),
    items: z.array(roundupItemSchema),
    group_title: z.string().optional(),
    group_description: z.string().optional(),
    show_stats: z.boolean().optional(),
    visible_badges: z.array(z.string()).optional(),
  })
  .passthrough();

/**
 * Accepts a roundup payload as an object or JSON string, validates its structure,
 * and returns the parsed object (or `undefined` for an empty/blank payload).
 * Mirrors the `content_json` input-schema pattern: reject-on-error at save.
 */
export const RoundupJsonInputSchema = z.unknown().transform((input, ctx) => {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    if (input.trim() === '') return undefined;
    try {
      parsed = JSON.parse(input);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'roundup_json must be valid JSON' });
      return z.NEVER;
    }
  }

  if (parsed === null || parsed === undefined) return undefined;

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    ctx.addIssue({ code: 'custom', message: 'roundup_json must be a roundup object' });
    return z.NEVER;
  }

  const result = roundupObjectSchema.safeParse(parsed);
  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      message: result.error.issues[0]?.message || 'Invalid roundup_json',
    });
    return z.NEVER;
  }

  return result.data;
});
