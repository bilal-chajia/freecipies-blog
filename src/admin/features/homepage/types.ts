/**
 * Homepage admin types.
 *
 * The persisted payload is the same snake_case shape used by
 * site_settings.homepage_settings and /api/settings/homepage.
 */

import type {
  HomepageAboutAuthorSection,
  HomepageCategoryBrowseSection,
  HomepageCollectionsSection,
  HomepageFaqSection,
  HomepageFeaturedRecipesSection,
  HomepageHeroSection,
  HomepageLatestSection,
  HomepageNewsletterSection,
  HomepageSection,
  HomepageSettings,
  HomepageStoriesSection,
  PageSeoSettings,
} from '@modules/settings/types/settings.types';

export type HomepageFormData = HomepageSettings;

export type EditableHomepageSection =
  | HomepageStoriesSection
  | HomepageHeroSection
  | HomepageFeaturedRecipesSection
  | HomepageCategoryBrowseSection
  | HomepageCollectionsSection
  | HomepageLatestSection
  | HomepageAboutAuthorSection
  | HomepageNewsletterSection
  | HomepageFaqSection;

export type HomepageSectionId =
  | 'stories'
  | 'hero'
  | 'featured'
  | 'categories'
  | 'collections'
  | 'latest'
  | 'about'
  | 'newsletter'
  | 'faq';

export interface HomepageSectionProps {
  formData: HomepageFormData;
  updateSection: (id: string, updater: (section: HomepageSection) => HomepageSection) => void;
  updateSeo: (patch: Partial<PageSeoSettings>) => void;
}
