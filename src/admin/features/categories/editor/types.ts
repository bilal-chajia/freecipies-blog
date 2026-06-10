/**
 * Category editor — shared form types and helpers.
 * Form state is local UI state; serialization to the snake_case API payload
 * (images_json / seo_json / presentation_json) happens in handleSave.
 */

export type CategoryImageSlot = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  [key: string]: unknown;
};

export type CategoryImageTarget = 'thumbnail' | 'hero';

export interface CategoryFormData {
  slug: string;
  label: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  ogTitle: string;
  ogDescription: string;
  twitterCard: string;
  robots: string;
  noIndex: boolean;
  short_description: string;
  tldr: string;
  imageThumbnail: CategoryImageSlot | null;
  imageHero: CategoryImageSlot | null;
  collection_title: string;
  featuredArticleId: number | null;
  showHeroCta: boolean;
  heroCtaText: string;
  heroCtaLink: string;
  workflow_status: string;
  is_featured: boolean;
  displayOrder: number;
  color: string;
  parent_id: number | null;
}

export const INITIAL_FORM_DATA: CategoryFormData = {
  slug: '',
  label: '',
  headline: '',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogImage: '',
  ogTitle: '',
  ogDescription: '',
  twitterCard: 'summary_large_image',
  robots: '',
  noIndex: false,
  short_description: '',
  tldr: '',
  imageThumbnail: null,
  imageHero: null,
  collection_title: '',
  featuredArticleId: null,
  showHeroCta: true,
  heroCtaText: '',
  heroCtaLink: '',
  workflow_status: 'draft',
  is_featured: false,
  displayOrder: 0,
  color: '#ff6b35ff',
  parent_id: null,
};

/** API category response shape consumed by the editor (snake_case payload). */
export type CategoryRecord = Partial<Omit<CategoryFormData, 'sort_order'>> & {
  id?: number;
  image_url?: string;
  images_json?: string | Record<string, unknown> | null;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_card?: string | null;
  no_index?: boolean | null;
  short_description?: string;
  presentation_json?: string;
  sort_order?: string | number;
  collection_title?: string;
  workflow_status?: string;
  is_featured?: boolean;
  parent_id?: number | null;
  is_favorite?: boolean;
};

export interface ArticleRecord {
  id?: number;
  slug?: string;
  label?: string;
  title?: string;
}

interface ApiResponse<T> {
  data?: {
    data?: T;
  } | T;
}

export function unwrapApiData<T>(response: ApiResponse<T>, fallback: T): T {
  const first = response.data;
  if (first && typeof first === 'object' && 'data' in first) {
    return (first as { data?: T }).data ?? fallback;
  }
  return (first as T | undefined) ?? fallback;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } | string } } }).response;
    const apiError = response?.data?.error;
    if (typeof apiError === 'string') return apiError;
    if (apiError?.message) return apiError.message;
  }
  return 'Failed to save category';
}

export type FormChangeHandler = <K extends keyof CategoryFormData>(
  field: K,
  value: CategoryFormData[K],
) => void;
