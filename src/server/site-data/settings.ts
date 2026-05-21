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

async function loadSetting<T>(loader: (db: D1Database, options: { cache: KVNamespace | null }) => Promise<T>, fallback: T): Promise<T> {
  try {
    const db = getCloudflareEnv().DB;
    return db ? await loader(db, { cache: getSettingsCache() }) : fallback;
  } catch (error) {
    console.error("Failed to load site setting:", error);
    return fallback;
  }
}

export const getPublicSiteIdentity = (): Promise<SiteIdentitySettings> =>
  loadSetting(getSiteIdentitySettings, SITE_IDENTITY_DEFAULTS);

export const getPublicSeoDefaults = (): Promise<SeoDefaultsSettings> =>
  loadSetting(getSeoDefaultsSettings, SEO_DEFAULTS);

export const getPublicHomepageSettings = (): Promise<HomepageSettings> =>
  loadSetting(getHomepageSettings, HOMEPAGE_SETTINGS_DEFAULTS);

export const getPublicOrganizationProfile = (): Promise<OrganizationProfileSettings> =>
  loadSetting(getOrganizationProfileSettings, ORGANIZATION_PROFILE_DEFAULTS);

export const getPublicSocialLinks = (): Promise<PublicSocialLink[]> =>
  loadSetting(getPublicSocialLinksSettings, PUBLIC_SOCIAL_LINKS_DEFAULTS);
