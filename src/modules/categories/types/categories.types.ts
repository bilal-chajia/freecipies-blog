/**
 * Categories Module - TypeScript Types
 */

export interface CategoryImages {
  hero?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  thumbnail?: {
    url: string;
    alt?: string;
  };
  icon?: {
    url: string;
  };
}

import type { Category } from '../schema/categories.schema';
import type { ExtractedImage, ExtractedSeo } from '@shared/utils';

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
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}
