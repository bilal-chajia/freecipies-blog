import {
  getHomepageSettings,
  getOrganizationProfileSettings,
  getPublicSocialLinksSettings,
  getSeoDefaultsSettings,
  getSiteIdentitySettings,
} from "@modules/settings/services/settings.service";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import {
  HOMEPAGE_SETTINGS_DEFAULTS,
  ORGANIZATION_PROFILE_DEFAULTS,
  PUBLIC_SOCIAL_LINKS_DEFAULTS,
  SEO_DEFAULTS,
  SITE_IDENTITY_DEFAULTS,
  type HomepageSettings,
  type OrganizationProfileSettings,
  type PublicSocialLink,
  type SeoDefaultsSettings,
  type SiteIdentitySettings,
} from "@modules/settings/types/settings.types";
import { getCloudflareEnv, getSettingsCache } from "@server/cloudflare/env";

async function loadSetting<T>(
  loader: (db: D1Database, options: { cache: KVNamespace | null }) => Promise<T>,
  fallback: T,
  options?: { db?: D1Database; cache?: KVNamespace | null }
): Promise<T> {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return fallback;

    const cache = options?.cache !== undefined ? options.cache : getSettingsCache();
    return await loader(db, { cache });
  } catch (error) {
    console.error("Failed to load site setting:", error);
    return fallback;
  }
}

export const getPublicSiteIdentity = (options?: { db?: D1Database; cache?: KVNamespace | null }): Promise<SiteIdentitySettings> =>
  loadSetting(getSiteIdentitySettings, SITE_IDENTITY_DEFAULTS, options);

export const getPublicSeoDefaults = (options?: { db?: D1Database; cache?: KVNamespace | null }): Promise<SeoDefaultsSettings> =>
  loadSetting(getSeoDefaultsSettings, SEO_DEFAULTS, options);

export const getPublicHomepageSettings = (options?: { db?: D1Database; cache?: KVNamespace | null }): Promise<HomepageSettings> =>
  loadSetting(getHomepageSettings, HOMEPAGE_SETTINGS_DEFAULTS, options);

export const getPublicOrganizationProfile = (options?: { db?: D1Database; cache?: KVNamespace | null }): Promise<OrganizationProfileSettings> =>
  loadSetting(getOrganizationProfileSettings, ORGANIZATION_PROFILE_DEFAULTS, options);

export const getPublicSocialLinks = (options?: { db?: D1Database; cache?: KVNamespace | null }): Promise<PublicSocialLink[]> =>
  loadSetting(getPublicSocialLinksSettings, PUBLIC_SOCIAL_LINKS_DEFAULTS, options);
