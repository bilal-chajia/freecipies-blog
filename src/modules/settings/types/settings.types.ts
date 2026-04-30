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

export interface LegacyTocSettings {
  enabled: boolean;
  numbering: boolean;
  collapsible: boolean;
  defaultOpen: boolean;
  showJumpButton: boolean;
  accentColor: string;
  maxDepth: number;
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

export type TocSettingsInput = Partial<TocSettings> | Partial<LegacyTocSettings> | null | undefined;

export function normalizeTocSettings(input: TocSettingsInput): TocSettings {
  const raw = input ?? {};
  const canonical = raw as Partial<TocSettings>;
  const legacy = raw as Partial<LegacyTocSettings>;

  return {
    enabled: canonical.enabled ?? TOC_DEFAULTS.enabled,
    numbering: canonical.numbering ?? TOC_DEFAULTS.numbering,
    collapsible: canonical.collapsible ?? TOC_DEFAULTS.collapsible,
    default_open: canonical.default_open ?? legacy.defaultOpen ?? TOC_DEFAULTS.default_open,
    show_jump_button: canonical.show_jump_button ?? legacy.showJumpButton ?? TOC_DEFAULTS.show_jump_button,
    accent_color: canonical.accent_color ?? legacy.accentColor ?? TOC_DEFAULTS.accent_color,
    max_depth: canonical.max_depth ?? legacy.maxDepth ?? TOC_DEFAULTS.max_depth,
  };
}
