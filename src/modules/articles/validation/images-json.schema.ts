/**
 * Structural save-time validation for `articles.images_json`.
 *
 * Deliberately MINIMAL: the snapshot map holds server-resolved, regenerable
 * image data (variants with r2_key, alt, content_images arrays, etc.), so the
 * only high-confidence structural invariant is that the root is a plain object
 * (a slot map). Deep fields stay loose to avoid false rejections.
 *
 * @see docs/IMAGE_JSON_CONTRACT.md
 */
import { z } from 'zod';

export const ImagesJsonInputSchema = z.unknown().transform((input, ctx) => {
  let parsed: unknown = input;

  if (typeof input === 'string') {
    if (input.trim() === '') return undefined;
    try {
      parsed = JSON.parse(input);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'images_json must be valid JSON' });
      return z.NEVER;
    }
  }

  if (parsed === null || parsed === undefined) return undefined;

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    ctx.addIssue({ code: 'custom', message: 'images_json must be a slot-map object' });
    return z.NEVER;
  }

  return parsed as Record<string, unknown>;
});
