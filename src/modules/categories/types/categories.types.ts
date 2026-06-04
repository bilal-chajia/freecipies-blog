/**
 * Categories Module - TypeScript Types
 */

import type { Category } from '../schema/categories.schema';
import type { ExtractedImage } from '@shared/utils';
import type { CategoryImagesJson } from '../../articles/types/images.types';

export type CategoryImages = CategoryImagesJson;

export type HydratedCategory = Category & ExtractedImage & {
  route: string;
  is_favorite?: boolean; // Legacy UI alias for is_featured
  meta_title?: string | null;
  meta_description?: string | null;
  no_index?: boolean;
  canonical?: string;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_card?: string;
  posts_per_page?: number;
  tldr?: string;
  layout_mode?: 'grid' | 'list' | 'masonry';
  card_style?: 'compact' | 'full' | 'minimal';
  show_in_nav?: boolean;
  show_in_footer?: boolean;
  show_sidebar?: boolean;
  show_filters?: boolean;
  show_breadcrumb?: boolean;
  show_pagination?: boolean;
  article_sort_by?: 'published_at' | 'title' | 'view_count';
  article_sort_order?: 'asc' | 'desc';
  header_style?: 'hero' | 'minimal' | 'none';
  featured_article_id?: number;
  show_featured_recipe?: boolean;
  show_hero_cta?: boolean;
  hero_cta_text?: string;
  hero_cta_link?: string;
};

export interface CategoryConfig {
  show_in_nav?: boolean;
  show_in_footer?: boolean;
  layout_mode?: 'grid' | 'list' | 'masonry';
  posts_per_page?: number;
  card_style?: 'compact' | 'full' | 'minimal';
  show_sidebar?: boolean;
  show_filters?: boolean;
  show_breadcrumb?: boolean;
  show_pagination?: boolean;
  article_sort_by?: 'published_at' | 'title' | 'view_count';
  article_sort_order?: 'asc' | 'desc';
  header_style?: 'hero' | 'minimal' | 'none';
  tldr?: string;
  featured_article_id?: number;
  show_featured_recipe?: boolean;
  show_hero_cta?: boolean;
  hero_cta_text?: string;
  hero_cta_link?: string;
}

export interface CategorySeo {
  meta_title?: string;
  meta_description?: string;
  no_index?: boolean;
  canonical?: string;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  twitter_card?: string;
  robots?: string;
}
