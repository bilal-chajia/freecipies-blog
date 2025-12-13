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
  image?: Image;
  collectionTitle: string;
  numEntriesPerPage: number;
  isOnline: boolean;
  isFavorite: boolean;
  sortOrder: number;
  color?: string;
  createdAt: string;
  updatedAt: string; // ISO 8601 string
  route?: string; // Derived property
}

export interface Author {
  id: number;
  slug: string;
  name: string;
  email: string;
  job?: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  tldr: string;
  image?: Image;
  bio?: AuthorBio; // Use specific type for JSON
  isOnline: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string; // ISO 8601 string
  route?: string; // Derived property
}

export interface Tag {
  id: number;
  slug: string;
  label: string;
  color?: string;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  route?: string; // Derived property
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
  canonicalUrl?: string;
  shortDescription: string;
  tldr: string;
  introduction?: string;
  summary?: string;
  image?: Image;
  cover?: Image;
  contentJson?: any; // Consider defining a structure for article content
  recipeJson?: RecipeDetails;
  faqsJson?: FaqItem[];
  keywords?: string[];
  referencesJson?: any[];
  mediaJson?: any;
  isOnline: boolean;
  isFavorite: boolean;
  publishedAt?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string; // ISO 8601 string
  categoryLabel?: string;
  authorName?: string;
  tags?: Tag[];
  route?: string; // Derived property
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
