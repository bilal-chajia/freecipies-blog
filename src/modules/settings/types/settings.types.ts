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
