/**
 * Media Snapshot Sync Service
 * ============================
 * Application-level propagation of media metadata changes to all
 * referencing image snapshots (articles, authors, categories).
 *
 * Architecture decision: This uses application-level batch updates
 * instead of SQL triggers because:
 *   - D1/Workers CPU time limits make cascading triggers risky
 *   - SQLite's JSON mutation functions are fragile for deep nested paths
 *   - Application code has full TypeScript type safety and logging
 *
 * Contract: docs/IMAGE_JSON_CONTRACT.md — snapshots are "always
 * regenerable from the media row."
 */

import type { D1Database } from '@cloudflare/workers-types';
import { eq, and, isNull, like } from 'drizzle-orm';
import { getDb, type DrizzleDb } from '@shared/database/drizzle';
import { media, type Media } from '../schema/media.schema';
import { articles } from '../../articles/schema/articles.schema';
import { authors } from '../../authors/schema/authors.schema';
import { categories } from '../../categories/schema/categories.schema';
import {
  normalizeMediaVariantsJson,
} from '@shared/images/image-contract';
import type { StorageVariant, StrictStorageVariants } from '@shared/types/images';

// ─── Types ───────────────────────────────────────────────────────

export interface SnapshotSyncResult {
  mediaId: number;
  articlesUpdated: number;
  authorsUpdated: number;
  categoriesUpdated: number;
  errors: string[];
}

interface SnapshotPatch {
  alt?: string;
  caption?: string;
  credit?: unknown;
  placeholder?: string;
  focal_point?: { x: number; y: number };
  aspect_ratio?: string;
  variants?: StrictStorageVariants;
}

// ─── Core Logic ──────────────────────────────────────────────────

/**
 * Build a patch object from a media row containing only the fields
 * that snapshots should mirror from the source-of-truth media record.
 */
function buildSnapshotPatch(mediaRow: Media): SnapshotPatch {
  const patch: SnapshotPatch = {
    alt: mediaRow.altText,
    caption: mediaRow.caption,
  };

  // Parse credit JSON
  if (mediaRow.credit) {
    try {
      const parsed = JSON.parse(mediaRow.credit);
      patch.credit = parsed;
    } catch {
      // Keep existing credit if parse fails
    }
  }

  // Parse focal_point
  if (mediaRow.focalPointJson) {
    try {
      const fp = JSON.parse(mediaRow.focalPointJson);
      if (typeof fp?.x === 'number' && typeof fp?.y === 'number') {
        patch.focal_point = fp;
      }
    } catch { /* keep existing */ }
  }

  // Parse aspect_ratio
  if (mediaRow.aspectRatio) {
    patch.aspect_ratio = mediaRow.aspectRatio;
  }

  // Parse variants + placeholder from variants_json
  if (mediaRow.variantsJson) {
    try {
      const normalized = normalizeMediaVariantsJson(mediaRow.variantsJson);
      patch.placeholder = normalized.placeholder;
      patch.variants = normalized.variants;
    } catch { /* keep existing */ }
  }

  return patch;
}

/**
 * Apply a snapshot patch to a single image slot object.
 * Only updates fields that the snapshot already contains or that
 * should be present per the contract.
 *
 * @param slot - The existing snapshot slot (hero, thumbnail, etc.)
 * @param patch - Fresh data from the media row
 * @param allowedVariantKeys - Which variant keys this slot should contain
 * @returns The updated slot, or null if the slot is invalid
 */
function applyPatchToSlot(
  slot: Record<string, unknown>,
  patch: SnapshotPatch,
  allowedVariantKeys: readonly (keyof StrictStorageVariants)[]
): Record<string, unknown> {
  const updated = { ...slot };

  // Always update these required fields
  if (patch.alt !== undefined) updated.alt = patch.alt;
  if (patch.caption !== undefined) updated.caption = patch.caption;
  if (patch.credit !== undefined) updated.credit = patch.credit;
  if (patch.placeholder !== undefined) updated.placeholder = patch.placeholder;

  // Optional fields
  if (patch.focal_point !== undefined) updated.focal_point = patch.focal_point;
  if (patch.aspect_ratio !== undefined) updated.aspect_ratio = patch.aspect_ratio;

  // Rebuild variants for the allowed keys only
  if (patch.variants) {
    const newVariants: Partial<Record<keyof StrictStorageVariants, StorageVariant>> = {};
    for (const key of allowedVariantKeys) {
      const source = patch.variants[key];
      if (source) {
        newVariants[key] = source;
      }
    }
    if (Object.keys(newVariants).length > 0) {
      updated.variants = newVariants;
    }
  }

  return updated;
}

// Variant keys by slot type (per IMAGE_JSON_CONTRACT.md Snapshot Variant Matrix)
const HERO_ALLOWED = ['sm', 'md', 'lg'] as const;
const THUMBNAIL_ALLOWED = ['xs', 'sm'] as const;
const AVATAR_ALLOWED = ['xs', 'sm'] as const;
const RECIPE_STEP_ALLOWED = ['sm', 'md'] as const;

/**
 * Apply the patch to an entire images_json container.
 * Returns the updated container JSON string, or null if no changes were made.
 */
function patchImagesJsonContainer(
  imagesJsonStr: string | null,
  mediaId: number,
  patch: SnapshotPatch,
  containerKind: 'article' | 'author' | 'category'
): string | null {
  if (!imagesJsonStr) return null;

  let container: Record<string, unknown>;
  try {
    container = JSON.parse(imagesJsonStr);
    if (typeof container !== 'object' || container === null) return null;
  } catch {
    return null;
  }

  let changed = false;

  // Check hero slot
  const hero = container.hero as Record<string, unknown> | undefined;
  if (hero && (hero.media_id === mediaId || hero.mediaId === mediaId)) {
    container.hero = applyPatchToSlot(hero, patch, HERO_ALLOWED);
    changed = true;
  }

  // Check thumbnail slot
  const thumbnail = container.thumbnail as Record<string, unknown> | undefined;
  if (thumbnail && (thumbnail.media_id === mediaId || thumbnail.mediaId === mediaId)) {
    container.thumbnail = applyPatchToSlot(thumbnail, patch, THUMBNAIL_ALLOWED);
    changed = true;
  }

  // Check avatar slot (authors only)
  if (containerKind === 'author') {
    const avatar = container.avatar as Record<string, unknown> | undefined;
    if (avatar && (avatar.media_id === mediaId || avatar.mediaId === mediaId)) {
      container.avatar = applyPatchToSlot(avatar, patch, AVATAR_ALLOWED);
      changed = true;
    }
  }

  // Check recipe_steps map (articles only)
  if (containerKind === 'article') {
    const recipeSteps = container.recipe_steps as Record<string, Record<string, unknown>> | undefined;
    if (recipeSteps && typeof recipeSteps === 'object') {
      for (const [stepKey, stepSlot] of Object.entries(recipeSteps)) {
        if (stepSlot && (stepSlot.media_id === mediaId || stepSlot.mediaId === mediaId)) {
          recipeSteps[stepKey] = applyPatchToSlot(stepSlot, patch, RECIPE_STEP_ALLOWED);
          changed = true;
        }
      }
    }
  }

  return changed ? JSON.stringify(container) : null;
}

/**
 * Patch cached_card_json thumbnail if it references the given media_id.
 */
function patchCachedCardJson(
  cachedCardStr: string | null,
  mediaId: number,
  patch: SnapshotPatch
): string | null {
  if (!cachedCardStr) return null;

  let card: Record<string, unknown>;
  try {
    card = JSON.parse(cachedCardStr);
    if (typeof card !== 'object' || card === null) return null;
  } catch {
    return null;
  }

  const thumbnail = card.thumbnail as Record<string, unknown> | undefined;
  if (!thumbnail) return null;
  if (thumbnail.media_id !== mediaId && thumbnail.mediaId !== mediaId) return null;

  card.thumbnail = applyPatchToSlot(thumbnail, patch, THUMBNAIL_ALLOWED);
  return JSON.stringify(card);
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Propagate a media metadata update to all referencing snapshots.
 *
 * Call this after `updateMedia()` when any of these fields change:
 *   alt_text, caption, credit, variants_json, focal_point_json, aspect_ratio
 *
 * The function finds all rows in articles, authors, and categories that
 * reference the given media_id via a `LIKE '%"media_id":N%'` scan, then
 * patches their image snapshots in-place.
 *
 * @param db - D1 database binding
 * @param mediaId - The ID of the media record that changed
 * @returns Sync statistics (rows updated, errors)
 */
export async function propagateMediaUpdate(
  db: D1Database | DrizzleDb,
  mediaId: number
): Promise<SnapshotSyncResult> {
  const drizzle = getDb(db);
  const result: SnapshotSyncResult = {
    mediaId,
    articlesUpdated: 0,
    authorsUpdated: 0,
    categoriesUpdated: 0,
    errors: [],
  };

  // 1. Fetch the fresh media row
  const mediaRow = await drizzle.query.media.findFirst({
    where: and(eq(media.id, mediaId), isNull(media.deletedAt)),
  });

  if (!mediaRow) {
    result.errors.push(`Media ${mediaId} not found or soft-deleted`);
    return result;
  }

  const patch = buildSnapshotPatch(mediaRow);
  const mediaIdPattern = `%"media_id":${mediaId}%`;

  // 2. Update articles (images_json + cached_card_json)
  try {
    const affectedArticles = await drizzle
      .select({
        id: articles.id,
        imagesJson: articles.imagesJson,
        cachedCardJson: articles.cachedCardJson,
      })
      .from(articles)
      .where(and(
        isNull(articles.deletedAt),
        like(articles.imagesJson, mediaIdPattern)
      ));

    for (const row of affectedArticles) {
      try {
        const updates: Record<string, string> = {};

        const patchedImages = patchImagesJsonContainer(row.imagesJson, mediaId, patch, 'article');
        if (patchedImages) updates.imagesJson = patchedImages;

        const patchedCard = patchCachedCardJson(row.cachedCardJson, mediaId, patch);
        if (patchedCard) updates.cachedCardJson = patchedCard;

        if (Object.keys(updates).length > 0) {
          await drizzle.update(articles)
            .set({ ...updates, updatedAt: new Date().toISOString() } as Partial<typeof articles.$inferInsert>)
            .where(eq(articles.id, row.id));
          result.articlesUpdated++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Article ${row.id}: ${message}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Articles scan failed: ${message}`);
  }

  // 3. Update authors (images_json — avatar/hero slots)
  try {
    const affectedAuthors = await drizzle
      .select({
        id: authors.id,
        imagesJson: authors.imagesJson,
      })
      .from(authors)
      .where(and(
        isNull(authors.deletedAt),
        like(authors.imagesJson, mediaIdPattern)
      ));

    for (const row of affectedAuthors) {
      try {
        const patchedImages = patchImagesJsonContainer(row.imagesJson, mediaId, patch, 'author');
        if (patchedImages) {
          await drizzle.update(authors)
            .set({ imagesJson: patchedImages, updatedAt: new Date().toISOString() })
            .where(eq(authors.id, row.id));
          result.authorsUpdated++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Author ${row.id}: ${message}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Authors scan failed: ${message}`);
  }

  // 4. Update categories (images_json — thumbnail/hero slots)
  try {
    const affectedCategories = await drizzle
      .select({
        id: categories.id,
        imagesJson: categories.imagesJson,
      })
      .from(categories)
      .where(and(
        isNull(categories.deletedAt),
        like(categories.imagesJson, mediaIdPattern)
      ));

    for (const row of affectedCategories) {
      try {
        const patchedImages = patchImagesJsonContainer(row.imagesJson, mediaId, patch, 'category');
        if (patchedImages) {
          await drizzle.update(categories)
            .set({ imagesJson: patchedImages, updatedAt: new Date().toISOString() })
            .where(eq(categories.id, row.id));
          result.categoriesUpdated++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Category ${row.id}: ${message}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Categories scan failed: ${message}`);
  }

  return result;
}
