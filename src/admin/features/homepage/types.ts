/**
 * Homepage Types Configuration
 */

export type HeroSectionData = {
  enabled: boolean;
  title: string;
  subtitle: string;
  backgroundImage: string;
  backgroundColor: string;
  ctaText: string;
  ctaLink: string;
  showSearch: boolean;
};

export type FeaturedPostsData = {
  enabled: boolean;
  title: string;
  subtitle: string;
  displayType: string;
  maxPosts: number;
  categoryFilter: string;
  tagFilter: string;
  sortBy: string;
  sortOrder: string;
};

export type CategoriesSectionData = {
  enabled: boolean;
  title: string;
  subtitle: string;
  displayType: string;
  maxCategories: number;
  showPostCount: boolean;
  showDescription: boolean;
};

export type LatestPostsData = {
  enabled: boolean;
  title: string;
  subtitle: string;
  maxPosts: number;
  showExcerpt: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showViews: boolean;
};

export type PopularPostsData = {
  enabled: boolean;
  title: string;
  subtitle: string;
  maxPosts: number;
  timeRange: string;
  showViews: boolean;
  showExcerpt: boolean;
};

export type NewsletterData = {
  enabled: boolean;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  placeholderText: string;
  successMessage: string;
  privacyText: string;
};

export type BannerConfigData = {
  enabled: boolean;
  title: string;
  description: string;
  image: string;
  link: string;
  buttonText: string;
  position: string;
  size: string;
};

export type BannersData = {
  enabled: boolean;
  banner1: BannerConfigData;
  banner2: BannerConfigData;
};

export type SeoData = {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
};

export type HomepageFormData = {
  hero: HeroSectionData;
  featuredPosts: FeaturedPostsData;
  categories: CategoriesSectionData;
  latestPosts: LatestPostsData;
  popularPosts: PopularPostsData;
  newsletter: NewsletterData;
  banners: BannersData;
  seo: SeoData;
};

export interface HomepageSectionProps {
  formData: HomepageFormData;
  handleNestedInputChange: (sectionKey: keyof HomepageFormData, field: string, value: unknown) => void;
}
