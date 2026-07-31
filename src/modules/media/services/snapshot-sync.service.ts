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

import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { eq, and, isNull, like } from 'drizzle-orm';
import { getDb, type DrizzleDb } from '@shared/database/drizzle';
import { media, type Media } from '../schema/media.schema';
import { articles } from '../../articles/schema/articles.schema';
import { authors } from '../../authors/schema/authors.schema';
import { categories } from '../../categories/schema/categories.schema';
import { siteSettings } from '../../settings/schema/settings.schema';
import { invalidateSettingCache } from '../../settings/services/settings.service';
import {
  buildSnapshotPatch,
  applyPatchToSlot,
  HERO_ALLOWED_VARIANTS,
  THUMBNAIL_ALLOWED_VARIANTS,
  AVATAR_ALLOWED_VARIANTS,
  RECIPE_STEP_ALLOWED_VARIANTS,
} from '@shared/images/image-contract';
import type { SnapshotPatch } from '@shared/images/image-contract';
import type { StorageVariant, StrictStorageVariants } from '@shared/types/images';

// ─── Types ───────────────────────────────────────────────────────

export interface SnapshotSyncResult {
  mediaId: number;
  articlesUpdated: number;
  authorsUpdated: number;
  categoriesUpdated: number;
  homepageSettingsUpdated: boolean;
  errors: string[];
}

export interface SnapshotSyncOptions {
  cache?: Pick<KVNamespace, 'delete'> | null;
}

// ─── Core Logic ──────────────────────────────────────────────────

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
    container.hero = applyPatchToSlot(hero, patch, HERO_ALLOWED_VARIANTS, { omitCaptionCredit: true });
    changed = true;
  }

  // Check thumbnail slot
  const thumbnail = container.thumbnail as Record<string, unknown> | undefined;
  if (thumbnail && (thumbnail.media_id === mediaId || thumbnail.mediaId === mediaId)) {
    container.thumbnail = applyPatchToSlot(thumbnail, patch, THUMBNAIL_ALLOWED_VARIANTS, { omitCaptionCredit: true });
    changed = true;
  }

  // Check avatar slot (authors only)
  if (containerKind === 'author') {
    const avatar = container.avatar as Record<string, unknown> | undefined;
    if (avatar && (avatar.media_id === mediaId || avatar.mediaId === mediaId)) {
      container.avatar = applyPatchToSlot(avatar, patch, AVATAR_ALLOWED_VARIANTS, { omitCaptionCredit: true });
      changed = true;
    }
  }

  // Check recipe_steps map (articles only)
  if (containerKind === 'article') {
    const recipeSteps = container.recipe_steps as Record<string, Record<string, unknown>> | undefined;
    if (recipeSteps && typeof recipeSteps === 'object') {
      for (const [stepKey, stepSlot] of Object.entries(recipeSteps)) {
        if (stepSlot && (stepSlot.media_id === mediaId || stepSlot.mediaId === mediaId)) {
          recipeSteps[stepKey] = applyPatchToSlot(stepSlot, patch, RECIPE_STEP_ALLOWED_VARIANTS);
          changed = true;
        }
      }
    }
  }

  return changed ? JSON.stringify(container) : null;
}

/**
 * Patch cached_card_json image if it references the given media_id.
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

  const image = card.image as Record<string, unknown> | undefined;
  if (!image) return null;
  if (image.media_id !== mediaId && image.mediaId !== mediaId) return null;

  card.image = applyPatchToSlot(image, patch, THUMBNAIL_ALLOWED_VARIANTS, { omitCaptionCredit: true });
  return JSON.stringify(card);
}

/**
 * Patch spotlight snapshots in the single cached homepage settings document.
 * The public homepage consumes this document directly, so no media read is
 * necessary while rendering the section.
 */
function patchHomepageSettings(
  value: string,
  mediaId: number,
  patch: SnapshotPatch,
): string | null {
  let settings: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    settings = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  if (!Array.isArray(settings.sections)) return null;

  let changed = false;
  for (const section of settings.sections) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) continue;

    const spotlight = section as Record<string, unknown>;
    if (spotlight.type !== 'seasonal_spotlight') continue;

    const image = spotlight.image;
    if (!image || typeof image !== 'object' || Array.isArray(image)) continue;

    const imageSnapshot = image as Record<string, unknown>;
    if (imageSnapshot.media_id !== mediaId) continue;

    spotlight.image = applyPatchToSlot(
      imageSnapshot,
      patch,
      HERO_ALLOWED_VARIANTS,
      { omitCaptionCredit: true },
    );
    changed = true;
  }

  return changed ? JSON.stringify(settings) : null;
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
  mediaId: number,
  options?: SnapshotSyncOptions,
): Promise<SnapshotSyncResult> {
  const drizzle = getDb(db);
  const result: SnapshotSyncResult = {
    mediaId,
    articlesUpdated: 0,
    authorsUpdated: 0,
    categoriesUpdated: 0,
    homepageSettingsUpdated: false,
    errors: [],
  };

  // 1. Fetch the fresh media row
  const mediaRow = await drizzle.query.media.findFirst({
    where: and(eq(media.id, mediaId), isNull(media.deleted_at)),
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
        images_json: articles.images_json,
        cached_card_json: articles.cached_card_json,
      })
      .from(articles)
      .where(and(
        isNull(articles.deleted_at),
        like(articles.images_json, mediaIdPattern)
      ));

    for (const row of affectedArticles) {
      try {
        const updates: Record<string, string> = {};

        const patchedImages = patchImagesJsonContainer(row.images_json, mediaId, patch, 'article');
        if (patchedImages) updates.images_json = patchedImages;

        const patchedCard = patchCachedCardJson(row.cached_card_json, mediaId, patch);
        if (patchedCard) updates.cached_card_json = patchedCard;

        if (Object.keys(updates).length > 0) {
          await drizzle.update(articles)
            .set({ ...updates, updated_at: new Date().toISOString() } as Partial<typeof articles.$inferInsert>)
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
        images_json: authors.images_json,
      })
      .from(authors)
      .where(and(
        isNull(authors.deleted_at),
        like(authors.images_json, mediaIdPattern)
      ));

    for (const row of affectedAuthors) {
      try {
        const patchedImages = patchImagesJsonContainer(row.images_json, mediaId, patch, 'author');
        if (patchedImages) {
          await drizzle.update(authors)
            .set({ images_json: patchedImages, updated_at: new Date().toISOString() })
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
        images_json: categories.images_json,
      })
      .from(categories)
      .where(and(
        isNull(categories.deleted_at),
        like(categories.images_json, mediaIdPattern)
      ));

    for (const row of affectedCategories) {
      try {
        const patchedImages = patchImagesJsonContainer(row.images_json, mediaId, patch, 'category');
        if (patchedImages) {
          await drizzle.update(categories)
            .set({ images_json: patchedImages, updated_at: new Date().toISOString() })
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

  // 5. Update the one cached homepage settings row when it references this media.
  try {
    const [homepageSettings] = await drizzle
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, 'homepage_settings'));

    if (homepageSettings) {
      const patchedValue = patchHomepageSettings(homepageSettings.value, mediaId, patch);
      if (patchedValue) {
        await drizzle.update(siteSettings)
          .set({ value: patchedValue, updated_at: new Date().toISOString() })
          .where(eq(siteSettings.key, 'homepage_settings'));
        result.homepageSettingsUpdated = true;
        await invalidateSettingCache(options?.cache, 'homepage_settings');
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Homepage settings sync failed: ${message}`);
  }

  return result;
}
