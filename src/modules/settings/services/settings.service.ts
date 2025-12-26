/**
 * Settings Module - Database Service
 * ====================================
 * Database operations for site settings.
 */

import { eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { siteSettings, type SiteSetting, type NewSiteSetting } from '../schema/settings.schema';
import { createDb } from '../../../shared/database/drizzle';

/**
 * Get all settings
 */
export async function getSettings(db: D1Database): Promise<SiteSetting[]> {
  const drizzle = createDb(db);
  return await drizzle.select().from(siteSettings);
}

/**
 * Get a single setting by key
 */
export async function getSetting(db: D1Database, key: string): Promise<SiteSetting | null> {
  const drizzle = createDb(db);
  return await drizzle.query.siteSettings.findFirst({
    where: eq(siteSettings.key, key),
  }) || null;
}

/**
 * Get a setting value (parsed if JSON)
 */
export async function getSettingValue<T = any>(db: D1Database, key: string): Promise<T | null> {
  const setting = await getSetting(db, key);
  if (!setting) return null;

  try {
    return JSON.parse(setting.value) as T;
  } catch {
    return setting.value as unknown as T;
  }
}

/**
 * Create or update a setting
 */
export async function upsertSetting(
  db: D1Database,
  key: string,
  value: string | object,
  options?: { description?: string; category?: string; type?: string }
): Promise<boolean> {
  const drizzle = createDb(db);

  const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;

  // Try to update first
  const existing = await getSetting(db, key);

  if (existing) {
    await drizzle.update(siteSettings)
      .set({
        value: valueStr,
        updatedAt: new Date().toISOString(),
        ...(options?.description && { description: options.description }),
        ...(options?.category && { category: options.category }),
        ...(options?.type && { type: options.type }),
      })
      .where(eq(siteSettings.key, key));
  } else {
    await drizzle.insert(siteSettings).values({
      key,
      value: valueStr,
      description: options?.description,
      category: options?.category || 'general',
      type: options?.type || 'json',
    });
  }

  return true;
}

/**
 * Delete a setting
 */
export async function deleteSetting(db: D1Database, key: string): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(siteSettings).where(eq(siteSettings.key, key));
  return true;
}

/**
 * Get settings by category
 */
export async function getSettingsByCategory(db: D1Database, category: string): Promise<SiteSetting[]> {
  const drizzle = createDb(db);
  return await drizzle
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.category, category));
}

/**
 * Get dashboard statistics (aggregated data for admin dashboard)
 */
export async function getDashboardStats(db: D1Database): Promise<{
  articles: number;
  categories: number;
  authors: number;
  tags: number;
  totalViews: number;
}> {
  // Use raw SQL for cross-table aggregation
  const result = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL) as articles,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as categories,
      (SELECT COUNT(*) FROM authors WHERE deleted_at IS NULL) as authors,
      (SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL) as tags,
      (SELECT COALESCE(SUM(view_count), 0) FROM articles WHERE deleted_at IS NULL) as total_views
  `).first<{ articles: number; categories: number; authors: number; tags: number; total_views: number }>();

  return {
    articles: result?.articles || 0,
    categories: result?.categories || 0,
    authors: result?.authors || 0,
    tags: result?.tags || 0,
    totalViews: result?.total_views || 0,
  };
}

// ============================================
// IMAGE UPLOAD SETTINGS
// ============================================

import { IMAGE_UPLOAD_DEFAULTS, IMAGE_SETTINGS_DB_KEY } from '../../../shared/constants/image-upload';
import type { ImageUploadSettings } from '../../../shared/constants/image-upload';

// Re-export for backwards compatibility
export { IMAGE_UPLOAD_DEFAULTS, type ImageUploadSettings };

const IMAGE_SETTINGS_KEY = IMAGE_SETTINGS_DB_KEY;

/**
 * Get image upload settings (merged with defaults)
 */
export async function getImageUploadSettings(db: D1Database): Promise<ImageUploadSettings> {
  const stored = await getSettingValue<Partial<ImageUploadSettings>>(db, IMAGE_SETTINGS_KEY);
  return { ...IMAGE_UPLOAD_DEFAULTS, ...stored };
}

/**
 * Update image upload settings (partial update)
 */
export async function updateImageUploadSettings(
  db: D1Database,
  updates: Partial<ImageUploadSettings>
): Promise<ImageUploadSettings> {
  // Get current settings
  const current = await getImageUploadSettings(db);

  // Merge with updates
  const newSettings = { ...current, ...updates };

  // Save
  await upsertSetting(db, IMAGE_SETTINGS_KEY, newSettings, {
    description: 'Image upload module configuration',
    category: 'media',
    type: 'json',
  });

  return newSettings;
}

/**
 * Reset image upload settings to defaults
 */
export async function resetImageUploadSettings(db: D1Database): Promise<ImageUploadSettings> {
  await upsertSetting(db, IMAGE_SETTINGS_KEY, IMAGE_UPLOAD_DEFAULTS, {
    description: 'Image upload module configuration',
    category: 'media',
    type: 'json',
  });
  return IMAGE_UPLOAD_DEFAULTS;
}
