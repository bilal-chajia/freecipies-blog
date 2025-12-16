// Freecipies Blog Platform - TypeScript Type Definitions

// --- Utility & JSON Field Types ---

export interface Image {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface AuthorBio {
  paragraphs: string[];
  networks?: { name: string; url: string }[];
}

export interface RecipeDetails {
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  difficulty?: string;
  calories?: string;
  cuisine?: string;
  course?: string;
  rating?: number;
  ingredients: { group: string; items: string[] }[];
  instructions: { group: string; steps: string[] }[];
  nutrition?: Record<string, string>;
  notes?: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Category {
  id: number;
  slug: string;
  label: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  tldr: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  collectionTitle: string;
  numEntriesPerPage: number;
  isOnline: boolean;
  isFavorite: boolean;
  sortOrder: number;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  route?: string;
}

export interface Author {
  id: number;
  slug: string;
  name: string;
  email: string;
  alternateName?: string | null;
  job?: string | null;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  tldr: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  bioJson?: string | null;
  isOnline: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  route?: string;
}

export interface Tag {
  id: number;
  slug: string;
  label: string;
  color?: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  route?: string;
}

export interface Article {
  id: number;
  slug: string;
  type: 'article' | 'recipe';
  categorySlug: string;
  authorSlug: string;
  label: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string | null;
  shortDescription: string;
  tldr: string;
  introduction?: string | null;
  summary?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  coverUrl?: string | null;
  coverAlt?: string | null;
  coverWidth?: number | null;
  coverHeight?: number | null;
  contentJson?: string | null;
  recipeJson?: RecipeDetails | null;
  faqsJson?: FaqItem[] | null;
  keywordsJson?: string | null;
  referencesJson?: string | null;
  mediaJson?: string | null;
  isOnline: boolean;
  isFavorite: boolean;
  publishedAt?: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  // Relations (from joins)
  category?: Category;
  author?: Author;
  tags?: Tag[];
  categoryLabel?: string;
  authorName?: string;
  route?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
export interface Media {
  id: number;
  filename: string;
  r2Key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  altText?: string;
  attribution?: string;
  uploadedBy?: string;
  uploadedAt: string;
}
