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
export type SettingsCacheInvalidator = Pick<KVNamespace, 'delete'>;

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
    return JSON.parse(value);
  } catch {
    return value as T & string;
  }
}

export async function invalidateSettingCache(
  cache: SettingsCacheInvalidator | null | undefined,
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
    // Write permanently into the KV cache (no expirationTtl) to prevent D1 row reads
    await options.cache.put(cacheKey, setting.value);
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
        updated_at: new Date().toISOString(),
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

  // Write-through cache: actively write the updated value to the KV cache permanently
  if (options?.cache) {
    await options.cache.put(getSettingCacheKey(key), valueStr);
  }
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
  total_articles: number;
  total_recipes: number;
  total_categories: number;
  total_authors: number;
  total_tags: number;
  total_views: number;
  articles_over_time: { month: string; articles: number; views: number }[];
  trends: { articles: string | null; recipes: string | null; views: string | null; authors: string | null } | null;
}> {
  // Get the underlying D1Database for raw SQL queries
  const d1 = 'prepare' in db ? db : (db as any).client as D1Database;

  // Use raw SQL for cross-table aggregation
  const result = await d1.prepare(`
    SELECT
      (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL) as total_articles,
      (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL AND type = 'recipe') as total_recipes,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as total_categories,
      (SELECT COUNT(*) FROM authors WHERE deleted_at IS NULL) as total_authors,
      (SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL) as total_tags,
      (SELECT COALESCE(SUM(view_count), 0) FROM articles WHERE deleted_at IS NULL) as total_views
  `).first<{
    total_articles: number;
    total_recipes: number;
    total_categories: number;
    total_authors: number;
    total_tags: number;
    total_views: number;
  }>();

  // Articles created per month over the last 6 months
  const timeSeriesResult = await d1.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COUNT(*) as articles
    FROM articles
    WHERE deleted_at IS NULL
      AND created_at >= date('now', '-5 months', 'start of month')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `).all<{ month: string; articles: number }>();

  // Normalize month labels (YYYY-MM -> Mon)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const articlesOverTime = (timeSeriesResult.results || []).map((row) => {
    const [year, monthNum] = row.month.split('-');
    const label = monthNames[parseInt(monthNum, 10) - 1];
    return {
      month: label,
      articles: row.articles,
      views: 0, // No historical view data available; honest placeholder
    };
  });

  // Backfill missing months with zero so the chart always has 6 points
  const now = new Date();
  const expectedMonths: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    expectedMonths.push(monthNames[d.getMonth()]);
  }
  const monthMap = new Map(articlesOverTime.map((r) => [r.month, r]));
  const backfilled = expectedMonths.map((m) => monthMap.get(m) || { month: m, articles: 0, views: 0 });

  return {
    total_articles: result?.total_articles || 0,
    total_recipes: result?.total_recipes || 0,
    total_categories: result?.total_categories || 0,
    total_authors: result?.total_authors || 0,
    total_tags: result?.total_tags || 0,
    total_views: result?.total_views || 0,
    articles_over_time: backfilled,
    trends: null, // Historical trends require time-series tables we don't yet have
  };
}

// ============================================
// IMAGE UPLOAD SETTINGS
// ============================================

import { IMAGE_UPLOAD_DEFAULTS, IMAGE_SETTINGS_DB_KEY } from '../../../shared/constants/image-upload';
import type { ImageUploadSettings } from '../../../shared/constants/image-upload';
import {
  DEFAULT_HOME_SECTIONS,
  HOMEPAGE_SETTINGS_DEFAULTS,
  ORGANIZATION_PROFILE_DEFAULTS,
  PUBLIC_SOCIAL_LINKS_DEFAULTS,
  SEO_DEFAULTS,
  SITE_IDENTITY_DEFAULTS,
  normalizeTocSettings,
  normalizeCategoryPageSettings,
  type CategoryPageSettings,
  type CategoryPageSettingsInput,
  type HomepageSection,
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

export function normalizeHomepageSections(
  sections: HomepageSection[] | undefined,
): HomepageSection[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    return DEFAULT_HOME_SECTIONS;
  }

  const nonFaqSections = sections.filter((section) => section.type !== 'faq');
  const existingFaq = sections.find((section) => section.type === 'faq');
  const hasStoredSocialProof = nonFaqSections.some((section) => section.type === 'social_proof');
  const missingP3bSections = DEFAULT_HOME_SECTIONS.filter((section) => (
    (section.type === 'quick_filters' || section.type === 'seasonal_spotlight')
    && !nonFaqSections.some((stored) => stored.type === section.type)
  ));
  const sectionsWithP3bDefaults = [...nonFaqSections, ...missingP3bSections];
  const insertMissingP3cSection = (
    current: HomepageSection[],
    type: 'social_proof' | 'social_feed' | 'lead_magnet',
    afterType: 'latest' | 'social_proof' | 'about_author' | undefined,
    beforeTypes: Array<'about_author' | 'newsletter'>,
  ): HomepageSection[] => {
    if (current.some((section) => section.type === type)) return current;

    const defaultSection = DEFAULT_HOME_SECTIONS.find((section) => section.type === type);
    if (!defaultSection) return current;

    const afterIndex = afterType
      ? current.findIndex((section) => section.type === afterType)
      : -1;
    if (afterIndex >= 0) {
      return [
        ...current.slice(0, afterIndex + 1),
        defaultSection,
        ...current.slice(afterIndex + 1),
      ];
    }

    const beforeIndex = current.findIndex((section) => beforeTypes.some((type) => section.type === type));
    if (beforeIndex < 0) return [...current, defaultSection];

    return [
      ...current.slice(0, beforeIndex),
      defaultSection,
      ...current.slice(beforeIndex),
    ];
  };
  const sectionsWithP3cDefaults = insertMissingP3cSection(
    insertMissingP3cSection(
      sectionsWithP3bDefaults,
      'social_proof',
      'latest',
      ['about_author'],
    ),
    'social_feed',
    hasStoredSocialProof ? 'social_proof' : undefined,
    ['about_author', 'newsletter'],
  );
  const sectionsWithP3dDefaults = insertMissingP3cSection(
    sectionsWithP3cDefaults,
    'lead_magnet',
    'about_author',
    ['newsletter'],
  );
  const defaultFaq = DEFAULT_HOME_SECTIONS.find((section) => section.type === 'faq');
  const faq = existingFaq ?? defaultFaq;

  return [
    ...sectionsWithP3dDefaults,
    ...(faq ? [faq] : []),
  ];
}

export async function getHomepageSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<HomepageSettings> {
  const stored = await getSettingValue<Partial<HomepageSettings>>(db, 'homepage_settings', options);
  return {
    seo: {
      ...HOMEPAGE_SETTINGS_DEFAULTS.seo,
      ...(stored?.seo && typeof stored.seo === 'object' ? stored.seo : {}),
    },
    sections: normalizeHomepageSections(stored?.sections),
  };
}

export async function updateHomepageSettings(
  db: D1Database | DrizzleDb,
  updates: Partial<HomepageSettings>,
  options?: SettingServiceOptions,
): Promise<HomepageSettings> {
  const current = await getHomepageSettings(db);
  const merged: HomepageSettings = {
    seo: { ...current.seo, ...(updates.seo ?? {}) },
    sections: normalizeHomepageSections(
      Array.isArray(updates.sections) ? updates.sections : current.sections,
    ),
  };

  await upsertSetting(db, 'homepage_settings', merged, {
    description: 'Homepage sections and SEO configuration',
    category: 'appearance',
    type: 'json',
    cache: options?.cache,
  });

  return merged;
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

// ============================================
// CATEGORY PAGE SETTINGS (global, per CATEGORIES_TABLE_CONTRACT.md)
// ============================================

const CATEGORY_PAGE_SETTINGS_KEY = 'category_page_settings';

export async function getCategoryPageSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<CategoryPageSettings> {
  const stored = await getSettingValue<CategoryPageSettingsInput>(db, CATEGORY_PAGE_SETTINGS_KEY, options);
  return normalizeCategoryPageSettings(stored);
}

export async function updateCategoryPageSettings(
  db: D1Database | DrizzleDb,
  updates: CategoryPageSettingsInput,
  options?: SettingServiceOptions,
): Promise<CategoryPageSettings> {
  const current = await getCategoryPageSettings(db);
  const merged = normalizeCategoryPageSettings({ ...current, ...normalizeCategoryPageSettings(updates) });

  await upsertSetting(db, CATEGORY_PAGE_SETTINGS_KEY, merged, {
    description: 'Global category page display settings',
    category: 'appearance',
    type: 'json',
    cache: options?.cache,
  });

  return merged;
}
