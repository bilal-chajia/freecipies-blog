/**
 * Settings Module - TypeScript Types
 */

export interface BrandingSettings {
  siteName?: string;
  tagline?: string;
  logo?: {
    light: string;
    dark: string;
  };
  favicon?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface SeoSettings {
  defaultTitle?: string;
  titleTemplate?: string;
  defaultDescription?: string;
  defaultImage?: string;
  twitterHandle?: string;
  facebookAppId?: string;
}

export interface SocialSettings {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  pinterest?: string;
  youtube?: string;
  tiktok?: string;
}

export interface AnalyticsSettings {
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
  pinterestTagId?: string;
}

export interface TocSettings {
  enabled: boolean;
  numbering: boolean;
  collapsible: boolean;
  default_open: boolean;
  show_jump_button: boolean;
  accent_color: string;
  max_depth: number;
}

export const TOC_DEFAULTS: TocSettings = {
  enabled: true,
  numbering: true,
  collapsible: true,
  default_open: true,
  show_jump_button: true,
  accent_color: '#f97316',
  max_depth: 4,
};

export type TocSettingsInput = Partial<TocSettings> | null | undefined;

export function normalizeTocSettings(input: TocSettingsInput): TocSettings {
  const canonical = input ?? {};

  return {
    enabled: canonical.enabled ?? TOC_DEFAULTS.enabled,
    numbering: canonical.numbering ?? TOC_DEFAULTS.numbering,
    collapsible: canonical.collapsible ?? TOC_DEFAULTS.collapsible,
    default_open: canonical.default_open ?? TOC_DEFAULTS.default_open,
    show_jump_button: canonical.show_jump_button ?? TOC_DEFAULTS.show_jump_button,
    accent_color: canonical.accent_color ?? TOC_DEFAULTS.accent_color,
    max_depth: canonical.max_depth ?? TOC_DEFAULTS.max_depth,
  };
}

export interface SiteIdentitySettings {
  site_name: string;
  site_url: string;
  tagline: string;
  locale: string;
}

export interface SeoDefaultsSettings {
  default_meta_description: string;
  default_og_image: string;
  twitter_card: 'summary' | 'summary_large_image';
  title_separator: string;
  robots_index: boolean;
  robots_follow: boolean;
}

export interface PageSeoSettings {
  meta_title: string;
  meta_description: string;
  no_index: boolean;
  canonical: string;
  og_image: string;
  og_title: string;
  og_description: string;
  twitter_card: 'summary' | 'summary_large_image';
}

export interface HomepageSettings {
  seo: PageSeoSettings;
}

export interface OrganizationProfileSettings {
  name: string;
  url: string;
  logo_url: string;
  same_as: string[];
  contact_email: string;
}

export interface PublicSocialLink {
  network: string;
  url: string;
  label: string;
}

export const SITE_IDENTITY_DEFAULTS: SiteIdentitySettings = {
  site_name: 'SaaS Blog',
  site_url: 'https://saas-blog.com',
  tagline: 'Reliable recipes and cooking guides.',
  locale: 'en-US',
};

export const SEO_DEFAULTS: SeoDefaultsSettings = {
  default_meta_description: 'Reliable recipes and cooking guides.',
  default_og_image: 'https://saas-blog.com/logo.png',
  twitter_card: 'summary_large_image',
  title_separator: '|',
  robots_index: true,
  robots_follow: true,
};

export const HOMEPAGE_SETTINGS_DEFAULTS: HomepageSettings = {
  seo: {
    meta_title: 'SaaS Blog',
    meta_description: 'Reliable recipes and cooking guides.',
    no_index: false,
    canonical: SITE_IDENTITY_DEFAULTS.site_url,
    og_image: SEO_DEFAULTS.default_og_image,
    og_title: 'SaaS Blog',
    og_description: 'Reliable recipes and cooking guides.',
    twitter_card: 'summary_large_image',
  },
};

export const ORGANIZATION_PROFILE_DEFAULTS: OrganizationProfileSettings = {
  name: SITE_IDENTITY_DEFAULTS.site_name,
  url: SITE_IDENTITY_DEFAULTS.site_url,
  logo_url: SEO_DEFAULTS.default_og_image,
  same_as: [],
  contact_email: 'contact@recipes-saas.com',
};

export const PUBLIC_SOCIAL_LINKS_DEFAULTS: PublicSocialLink[] = [];
