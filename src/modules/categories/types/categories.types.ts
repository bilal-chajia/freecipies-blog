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
};

export interface CategoryConfig {
  showInNav?: boolean;
  showInFooter?: boolean;
  layout?: 'grid' | 'list' | 'masonry';
  postsPerPage?: number;
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
