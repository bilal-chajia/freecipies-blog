/**
 * Homepage admin types.
 *
 * The form uses the admin-safe snake_case representation returned by
 * /api/settings/homepage. Storage-only image keys never enter this layer.
 */

import type {
  HomepageAboutAuthorSection,
  HomepageAdminSection,
  HomepageAdminSettings,
  HomepageCategoryBrowseSection,
  HomepageCollectionsSection,
  HomepageFaqSection,
  HomepageFeaturedRecipesSection,
  HomepageHeroSection,
  HomepageLatestSection,
  HomepageNewsletterSection,
  HomepageQuickFiltersSection,
  HomepageAdminSeasonalSpotlightSection,
  HomepageStoriesSection,
  PageSeoSettings,
} from '@modules/settings/types/settings.types';

export type HomepageFormData = HomepageAdminSettings;

export type EditableHomepageSection =
  | HomepageStoriesSection
  | HomepageHeroSection
  | HomepageQuickFiltersSection
  | HomepageFeaturedRecipesSection
  | HomepageCategoryBrowseSection
  | HomepageCollectionsSection
  | HomepageAdminSeasonalSpotlightSection
  | HomepageLatestSection
  | HomepageAboutAuthorSection
  | HomepageNewsletterSection
  | HomepageFaqSection;

export type HomepageSectionId =
  | 'stories'
  | 'hero'
  | 'quick_filters'
  | 'featured'
  | 'categories'
  | 'collections'
  | 'seasonal_spotlight'
  | 'latest'
  | 'about'
  | 'newsletter'
  | 'faq';

export interface HomepageSectionProps {
  formData: HomepageFormData;
  updateSection: (id: string, updater: (section: HomepageAdminSection) => HomepageAdminSection) => void;
  updateSeo: (patch: Partial<PageSeoSettings>) => void;
}
