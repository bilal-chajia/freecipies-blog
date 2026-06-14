/**
 * Structural save-time validation for `articles.faqs_json`.
 *
 * STRUCTURAL, not completeness: rejects corrupted/malformed payloads while
 * accepting incomplete drafts (blank items, missing answers). Mirrors the
 * `recipe_json` / `roundup_json` input-schema pattern.
 *
 * Canonical shape: { heading?, intro?, items: [{ question?, answer? }] }.
 * A bare top-level array of items is legacy-tolerated and normalized to { items }.
 *
 * @see docs/superpowers/plans/2026-06-13-cms-followups-validation-and-publish-guard.md
 */
import { z } from 'zod';

const faqItemSchema = z
  .object({
    question: z.string().optional(),
    answer: z.string().optional(),
    // legacy aliases tolerated by jsonld.normalizeFaqItems
    q: z.string().optional(),
    a: z.string().optional(),
  })
  .passthrough();

const faqsObjectSchema = z
  .object({
    heading: z.string().optional(),
    intro: z.union([z.string(), z.null()]).optional(),
    items: z.array(faqItemSchema),
  })
  .passthrough();

/**
 * Accepts a FAQs payload as an object, JSON string, or legacy bare array of
 * items, validates its structure, and returns the parsed object (or
 * `undefined` for an empty/blank payload). Mirrors the `recipe_json` /
 * `roundup_json` input-schema pattern.
 */
export const FaqsJsonInputSchema = z.unknown().transform((input, ctx) => {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    if (input.trim() === '') return undefined;
    try {
      parsed = JSON.parse(input);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'faqs_json must be valid JSON' });
      return z.NEVER;
    }
  }

  if (parsed === null || parsed === undefined) return undefined;

  // Legacy bare array → canonical { items }.
  if (Array.isArray(parsed)) parsed = { items: parsed };

  if (typeof parsed !== 'object') {
    ctx.addIssue({ code: 'custom', message: 'faqs_json must be a FAQ object' });
    return z.NEVER;
  }

  const result = faqsObjectSchema.safeParse(parsed);
  if (!result.success) {
    ctx.addIssue({ code: 'custom', message: result.error.issues[0]?.message || 'Invalid faqs_json' });
    return z.NEVER;
  }
  return result.data;
});
