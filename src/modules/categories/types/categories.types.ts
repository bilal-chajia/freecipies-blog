/**
 * Categories Module - TypeScript Types
 */

import type { Category } from '../schema/categories.schema';
import type { ExtractedImage, ExtractedSeo } from '@shared/utils';
import type { CategoryImagesJson } from '../../articles/types/images.types';

export type CategoryImages = CategoryImagesJson;

export type HydratedCategory = Category & ExtractedImage & ExtractedSeo & {
  route: string;
  isFavorite?: boolean; // Alias for isFeatured
  numEntriesPerPage?: number;
  tldr?: string;
  layoutMode?: 'grid' | 'list' | 'masonry';
  cardStyle?: 'compact' | 'full' | 'minimal';
  showInNav?: boolean;
  showInFooter?: boolean;
  showSidebar?: boolean;
  showFilters?: boolean;
  showBreadcrumb?: boolean;
  showPagination?: boolean;
  sortBy?: 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  headerStyle?: 'hero' | 'minimal' | 'none';
  featuredArticleId?: number;
  showFeaturedRecipe?: boolean;
  showHeroCta?: boolean;
  heroCtaText?: string;
  heroCtaLink?: string;
};

export interface CategoryConfig {
  showInNav?: boolean;
  showInFooter?: boolean;
  layout?: 'grid' | 'list' | 'masonry';
  postsPerPage?: number;
  cardStyle?: 'compact' | 'full' | 'minimal';
  showSidebar?: boolean;
  showFilters?: boolean;
  showBreadcrumb?: boolean;
  showPagination?: boolean;
  sortBy?: 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  headerStyle?: 'hero' | 'minimal' | 'none';
  tldr?: string;
  numEntriesPerPage?: number;
  featuredArticleId?: number;
  showFeaturedRecipe?: boolean;
  showHeroCta?: boolean;
  heroCtaText?: string;
  heroCtaLink?: string;
}

export interface CategorySeo {
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  canonical?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  robots?: string;
}
