/**
 * Settings Module - TypeScript Types
 */

import type {
  PublicImageVariantContract,
  StorageImageVariant,
} from '@shared/images/image-contract';

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

// ── Homepage section model ──

export type HomepageSectionType =
  | 'stories'
  | 'hero'
  | 'quick_filters'
  | 'featured_recipes'
  | 'category_browse'
  | 'collections'
  | 'seasonal_spotlight'
  | 'latest'
  | 'about_author'
  | 'newsletter'
  | 'faq';

export interface HomepageRecipeRef {
  article_id: number;
  headline: string;
  route: string;
  category?: { label: string; slug: string; color?: string } | null;
}

export interface HomepageRoundupRef {
  roundup_id: number;
  title: string;
  route: string;
}

export interface HomepageFaqItem {
  question: string;
  answer: string;
}

export interface HomepageQuickFilter {
  label: string;
  href: string;
}

export interface HomepageStoredImageSnapshot {
  media_id: number;
  alt: string;
  placeholder: string;
  focal_point?: { x: number; y: number };
  aspect_ratio?: string;
  variants: {
    sm: StorageImageVariant;
    md: StorageImageVariant;
    lg: StorageImageVariant;
  };
}

export interface HomepageCta {
  label: string;
  href: string;
}

export interface HomepageResolvedImageSnapshot {
  media_id: number;
  alt: string;
  placeholder: string;
  focal_point?: { x: number; y: number };
  aspect_ratio?: string;
  variants: {
    sm: PublicImageVariantContract;
    md: PublicImageVariantContract;
    lg: PublicImageVariantContract;
  };
}

interface HomepageSectionBase {
  id: string;
  enabled: boolean;
}

export interface HomepageStoriesSection extends HomepageSectionBase {
  type: 'stories';
}

export interface HomepageHeroSection extends HomepageSectionBase {
  type: 'hero';
  mode: 'slider' | 'grid';
  show_search: boolean;
  refs: HomepageRecipeRef[];
}

export interface HomepageQuickFiltersSection extends HomepageSectionBase {
  type: 'quick_filters';
  title: string;
  filters: HomepageQuickFilter[];
}

export interface HomepageFeaturedRecipesSection extends HomepageSectionBase {
  type: 'featured_recipes';
  title: string;
  subtitle: string;
  source: 'manual' | 'category' | 'latest';
  category_slug: string | null;
  count: number;
  refs: HomepageRecipeRef[];
}

export interface HomepageCategoryBrowseSection extends HomepageSectionBase {
  type: 'category_browse';
  title: string;
  subtitle: string;
  max: number;
}

export interface HomepageCollectionsSection extends HomepageSectionBase {
  type: 'collections';
  title: string;
  subtitle: string;
  refs: HomepageRoundupRef[];
}

export interface HomepageSeasonalSpotlightSection extends HomepageSectionBase {
  type: 'seasonal_spotlight';
  title: string;
  body: string;
  image: HomepageStoredImageSnapshot | null;
  cta: HomepageCta;
}

export interface HomepageLatestSection extends HomepageSectionBase {
  type: 'latest';
  title: string;
  count: number;
}

export interface HomepageAboutAuthorSection extends HomepageSectionBase {
  type: 'about_author';
  author_id: number | null;
}

export interface HomepageNewsletterSection extends HomepageSectionBase {
  type: 'newsletter';
  title: string;
  subtitle: string;
  button_text: string;
  placeholder_text: string;
}

export interface HomepageFaqSection extends HomepageSectionBase {
  type: 'faq';
  title: string;
  items: HomepageFaqItem[];
}

export type HomepageSection =
  | HomepageStoriesSection
  | HomepageHeroSection
  | HomepageQuickFiltersSection
  | HomepageFeaturedRecipesSection
  | HomepageCategoryBrowseSection
  | HomepageCollectionsSection
  | HomepageSeasonalSpotlightSection
  | HomepageLatestSection
  | HomepageAboutAuthorSection
  | HomepageNewsletterSection
  | HomepageFaqSection;

export interface HomepageSettings {
  seo: PageSeoSettings;
  sections: HomepageSection[];
}

export type HomepageAdminSeasonalSpotlightSection = Omit<HomepageSeasonalSpotlightSection, 'image'> & {
  image: HomepageResolvedImageSnapshot | null;
};

export type HomepageAdminSection = Exclude<HomepageSection, HomepageSeasonalSpotlightSection>
  | HomepageAdminSeasonalSpotlightSection;

export interface HomepageAdminSettings {
  seo: PageSeoSettings;
  sections: HomepageAdminSection[];
}

export const DEFAULT_HOME_SECTIONS: HomepageSection[] = [
  { id: 'stories', type: 'stories', enabled: true },
  { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: true, refs: [] },
  {
    id: 'quick_filters',
    type: 'quick_filters',
    enabled: false,
    title: 'Explore recipes',
    filters: [],
  },
  {
    id: 'featured',
    type: 'featured_recipes',
    enabled: true,
    title: 'Featured Recipes',
    subtitle: 'Handpicked for you',
    source: 'latest',
    category_slug: null,
    count: 4,
    refs: [],
  },
  { id: 'categories', type: 'category_browse', enabled: true, title: 'Browse by Category', subtitle: '', max: 8 },
  { id: 'collections', type: 'collections', enabled: true, title: 'Recipe Collections', subtitle: '', refs: [] },
  {
    id: 'seasonal_spotlight',
    type: 'seasonal_spotlight',
    enabled: false,
    title: 'Seasonal spotlight',
    body: '',
    image: null,
    cta: { label: '', href: '' },
  },
  { id: 'latest', type: 'latest', enabled: true, title: 'Latest Recipes', count: 8 },
  { id: 'about', type: 'about_author', enabled: true, author_id: null },
  {
    id: 'newsletter',
    type: 'newsletter',
    enabled: true,
    title: 'Get New Recipes Weekly',
    subtitle: 'Subscribe to receive delicious recipes straight to your inbox.',
    button_text: 'Subscribe',
    placeholder_text: 'Your email address',
  },
  {
    id: 'faq',
    type: 'faq',
    enabled: false,
    title: 'Frequently Asked Questions',
    items: [],
  },
];

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
  sections: DEFAULT_HOME_SECTIONS,
};

export const HOMEPAGE_ADMIN_SETTINGS_DEFAULTS: HomepageAdminSettings = {
  seo: { ...HOMEPAGE_SETTINGS_DEFAULTS.seo },
  sections: DEFAULT_HOME_SECTIONS.map((section): HomepageAdminSection => (
    section.type === 'seasonal_spotlight'
      ? { ...section, image: null }
      : section
  )),
};

export const ORGANIZATION_PROFILE_DEFAULTS: OrganizationProfileSettings = {
  name: SITE_IDENTITY_DEFAULTS.site_name,
  url: SITE_IDENTITY_DEFAULTS.site_url,
  logo_url: SEO_DEFAULTS.default_og_image,
  same_as: [],
  contact_email: 'contact@recipes-saas.com',
};

export const PUBLIC_SOCIAL_LINKS_DEFAULTS: PublicSocialLink[] = [];

export interface CategoryPageSettings {
  posts_per_page: number;
  layout_mode: 'grid' | 'list' | 'masonry';
  card_style: 'compact' | 'full' | 'minimal';
  show_sidebar: boolean;
  show_filters: boolean;
  show_breadcrumb: boolean;
  article_sort_by: 'published_at' | 'title' | 'view_count';
  article_sort_order: 'asc' | 'desc';
  header_style: 'hero' | 'minimal' | 'none';
}

export const CATEGORY_PAGE_SETTINGS_DEFAULTS: CategoryPageSettings = {
  posts_per_page: 12,
  layout_mode: 'grid',
  card_style: 'full',
  show_sidebar: true,
  show_filters: true,
  show_breadcrumb: true,
  article_sort_by: 'published_at',
  article_sort_order: 'desc',
  header_style: 'hero',
};

export type CategoryPageSettingsInput = Partial<CategoryPageSettings> | null | undefined;

export function normalizeCategoryPageSettings(
  input: CategoryPageSettingsInput,
): CategoryPageSettings {
  const canonical = input ?? {};
  return {
    posts_per_page: canonical.posts_per_page ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.posts_per_page,
    layout_mode: canonical.layout_mode ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.layout_mode,
    card_style: canonical.card_style ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.card_style,
    show_sidebar: canonical.show_sidebar ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.show_sidebar,
    show_filters: canonical.show_filters ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.show_filters,
    show_breadcrumb: canonical.show_breadcrumb ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.show_breadcrumb,
    article_sort_by: canonical.article_sort_by ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.article_sort_by,
    article_sort_order: canonical.article_sort_order ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.article_sort_order,
    header_style: canonical.header_style ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.header_style,
  };
}
