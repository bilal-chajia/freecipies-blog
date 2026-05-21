/**
 * Settings Module - Database Service
 * ====================================
 * Database operations for site settings.
 */

import { eq } from 'drizzle-orm';
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { siteSettings, type SiteSetting } from '../schema/settings.schema';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';

export type SettingsCacheStore = Pick<KVNamespace, 'get' | 'put' | 'delete'>;

interface SettingServiceOptions {
  cache?: SettingsCacheStore | null;
}

interface UpsertSettingOptions extends SettingServiceOptions {
  description?: string;
  category?: string;
  type?: string;
}

const SETTINGS_CACHE_PREFIX = 'site_settings:v1:';
const SETTINGS_CACHE_TTL_SECONDS = 60 * 60;

const getSettingCacheKey = (key: string): string => `${SETTINGS_CACHE_PREFIX}${key}`;

function parseSettingValue<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export async function invalidateSettingCache(
  cache: SettingsCacheStore | null | undefined,
  key: string,
): Promise<void> {
  if (!cache) return;
  await cache.delete(getSettingCacheKey(key));
}

/**
 * Get all settings
 */
export async function getSettings(db: D1Database | DrizzleDb): Promise<SiteSetting[]> {
  const drizzle = getDb(db);
  return await drizzle.select().from(siteSettings);
}

/**
 * Get a single setting by key
 */
export async function getSetting(db: D1Database | DrizzleDb, key: string): Promise<SiteSetting | null> {
  const drizzle = getDb(db);
  return await drizzle.query.siteSettings.findFirst({
    where: eq(siteSettings.key, key),
  }) || null;
}

/**
 * Get a setting value (parsed if JSON)
 */
export async function getSettingValue<T = unknown>(
  db: D1Database | DrizzleDb,
  key: string,
  options?: SettingServiceOptions,
): Promise<T | null> {
  const cacheKey = getSettingCacheKey(key);
  const cachedValue = options?.cache ? await options.cache.get(cacheKey) : null;
  if (cachedValue !== null) {
    return parseSettingValue<T>(cachedValue);
  }

  const setting = await getSetting(db, key);
  if (!setting) return null;

  if (options?.cache) {
    await options.cache.put(cacheKey, setting.value, {
      expirationTtl: SETTINGS_CACHE_TTL_SECONDS,
    });
  }

  return parseSettingValue<T>(setting.value);
}

/**
 * Create or update a setting
 */
export async function upsertSetting(
  db: D1Database | DrizzleDb,
  key: string,
  value: string | object,
  options?: UpsertSettingOptions
): Promise<boolean> {
  const drizzle = getDb(db);

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

  await invalidateSettingCache(options?.cache, key);
  return true;
}

/**
 * Delete a setting
 */
export async function deleteSetting(
  db: D1Database | DrizzleDb,
  key: string,
  options?: SettingServiceOptions,
): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.delete(siteSettings).where(eq(siteSettings.key, key));
  await invalidateSettingCache(options?.cache, key);
  return true;
}

/**
 * Get settings by category
 */
export async function getSettingsByCategory(db: D1Database | DrizzleDb, category: string): Promise<SiteSetting[]> {
  const drizzle = getDb(db);
  return await drizzle
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.category, category));
}

/**
 * Get dashboard statistics (aggregated data for admin dashboard)
 */
export async function getDashboardStats(db: D1Database | DrizzleDb): Promise<{
  articles: number;
  categories: number;
  authors: number;
  tags: number;
  totalViews: number;
}> {
  // Get the underlying D1Database for raw SQL queries
  const d1 = 'prepare' in db ? db : (db as any).client as D1Database;

  // Use raw SQL for cross-table aggregation
  const result = await d1.prepare(`
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
import {
  HOMEPAGE_SETTINGS_DEFAULTS,
  ORGANIZATION_PROFILE_DEFAULTS,
  PUBLIC_SOCIAL_LINKS_DEFAULTS,
  SEO_DEFAULTS,
  SITE_IDENTITY_DEFAULTS,
  normalizeTocSettings,
  type HomepageSettings,
  type OrganizationProfileSettings,
  type PublicSocialLink,
  type SeoDefaultsSettings,
  type SiteIdentitySettings,
  type TocSettings,
  type TocSettingsInput,
} from '../types/settings.types';

// Re-export for backwards compatibility
export { IMAGE_UPLOAD_DEFAULTS, type ImageUploadSettings };

const IMAGE_SETTINGS_KEY = IMAGE_SETTINGS_DB_KEY;

/**
 * Get image upload settings (merged with defaults)
 */
export async function getImageUploadSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<ImageUploadSettings> {
  const stored = await getSettingValue<Partial<ImageUploadSettings>>(db, IMAGE_SETTINGS_KEY, options);
  return { ...IMAGE_UPLOAD_DEFAULTS, ...stored };
}

/**
 * Update image upload settings (partial update)
 */
export async function updateImageUploadSettings(
  db: D1Database | DrizzleDb,
  updates: Partial<ImageUploadSettings>,
  options?: SettingServiceOptions,
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
    cache: options?.cache,
  });

  return newSettings;
}

/**
 * Reset image upload settings to defaults
 */
export async function resetImageUploadSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<ImageUploadSettings> {
  await upsertSetting(db, IMAGE_SETTINGS_KEY, IMAGE_UPLOAD_DEFAULTS, {
    description: 'Image upload module configuration',
    category: 'media',
    type: 'json',
    cache: options?.cache,
  });
  return IMAGE_UPLOAD_DEFAULTS;
}

// ============================================
// TOC (TABLE OF CONTENTS) SETTINGS
// ============================================

const TOC_SETTINGS_KEY = 'toc_settings';

/**
 * Get TOC settings (merged with defaults)
 */
export async function getTocSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<TocSettings> {
  const stored = await getSettingValue<TocSettingsInput>(db, TOC_SETTINGS_KEY, options);
  return normalizeTocSettings(stored);
}

/**
 * Update TOC settings (partial update)
 */
export async function updateTocSettings(
  db: D1Database | DrizzleDb,
  updates: TocSettingsInput,
  options?: SettingServiceOptions,
): Promise<TocSettings> {
  const current = await getTocSettings(db);
  const newSettings = normalizeTocSettings({ ...current, ...normalizeTocSettings(updates) });

  await upsertSetting(db, TOC_SETTINGS_KEY, newSettings, {
    description: 'Table of Contents display settings',
    category: 'appearance',
    type: 'json',
    cache: options?.cache,
  });

  return newSettings;
}

const mergeObject = <T extends object>(defaults: T, stored: Partial<T> | null): T => ({
  ...defaults,
  ...(stored && typeof stored === 'object' ? stored : {}),
});

export async function getSiteIdentitySettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<SiteIdentitySettings> {
  const stored = await getSettingValue<Partial<SiteIdentitySettings>>(db, 'site_identity', options);
  return mergeObject(SITE_IDENTITY_DEFAULTS, stored);
}

export async function getSeoDefaultsSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<SeoDefaultsSettings> {
  const stored = await getSettingValue<Partial<SeoDefaultsSettings>>(db, 'seo_defaults', options);
  return mergeObject(SEO_DEFAULTS, stored);
}

export async function getHomepageSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<HomepageSettings> {
  const stored = await getSettingValue<Partial<HomepageSettings>>(db, 'homepage_settings', options);
  return {
    ...HOMEPAGE_SETTINGS_DEFAULTS,
    ...(stored && typeof stored === 'object' ? stored : {}),
    seo: {
      ...HOMEPAGE_SETTINGS_DEFAULTS.seo,
      ...(stored?.seo && typeof stored.seo === 'object' ? stored.seo : {}),
    },
  };
}

export async function getOrganizationProfileSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<OrganizationProfileSettings> {
  const stored = await getSettingValue<Partial<OrganizationProfileSettings>>(db, 'organization_profile', options);
  return {
    ...ORGANIZATION_PROFILE_DEFAULTS,
    ...(stored && typeof stored === 'object' ? stored : {}),
    same_as: Array.isArray(stored?.same_as) ? stored.same_as : ORGANIZATION_PROFILE_DEFAULTS.same_as,
  };
}

export async function getPublicSocialLinksSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<PublicSocialLink[]> {
  const stored = await getSettingValue<PublicSocialLink[]>(db, 'public_social_links', options);
  return Array.isArray(stored) ? stored : PUBLIC_SOCIAL_LINKS_DEFAULTS;
}
