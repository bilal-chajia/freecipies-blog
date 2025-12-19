/**
 * Freecipies Blog Platform - TypeScript Type Definitions
 * ======================================================
 * 
 * Aligned with: db/schema.sql and src/lib/schema.ts
 * 
 * These interfaces mirror the Drizzle schema definitions.
 * For Drizzle-inferred types, import from schema.ts directly.
 */

// ============================================================================
// UTILITY & JSON FIELD TYPES
// ============================================================================

/** Single image with dimensions */
export interface Image {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/** Responsive image variants for srcset */
export interface ImageVariant {
  url: string;
  width: number;
  height: number;
  r2_key?: string; // Internal R2 reference (admin only)
}

export interface ImageVariants {
  xs?: ImageVariant;
  sm?: ImageVariant;
  md?: ImageVariant;
  lg?: ImageVariant;
  original?: ImageVariant;
}

/** Full image slot (used in categories.images_json, authors.images_json) */
export interface ImageSlot {
  media_id?: number;
  alt?: string;
  caption?: string;
  credit?: string;
  placeholder?: string; // Base64 Blurhash/LQIP
  focal_point?: { x: number; y: number };
  aspectRatio?: string; // "16:9", "1:1", etc.
  variants: ImageVariants;
}

/** Container for entity images (thumbnail + cover) */
export interface ImagesJson {
  thumbnail?: ImageSlot;
  cover?: ImageSlot;
  avatar?: ImageSlot; // For authors
}

/** Author bio with markdown and social links */
export interface BioJson {
  short?: string;
  long?: string; // Markdown
  socials?: {
    network: 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'pinterest' | 'tiktok' | 'linkedin' | 'website' | 'email' | 'custom';
    url: string;
    label?: string;
  }[];
}

/** SEO configuration */
export interface SeoJson {
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  canonical?: string | null;
  ogImage?: string;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterCard?: 'summary' | 'summary_large_image';
  robots?: string | null;
  jsonLd?: Record<string, unknown>;
}

/** Category/page configuration */
export interface ConfigJson {
  postsPerPage?: number;
  layoutMode?: 'grid' | 'list' | 'masonry';
  cardStyle?: 'compact' | 'full' | 'minimal';
  showSidebar?: boolean;
  showFilters?: boolean;
  showBreadcrumb?: boolean;
  showPagination?: boolean;
  sortBy?: 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  headerStyle?: 'hero' | 'minimal' | 'none';
}

/** Tag style configuration */
export interface TagStyleJson {
  color?: string;
  icon?: string;
}

/** Recipe details (stored in articles.recipe_json) */
export interface RecipeJson {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  servingSize?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  calories?: number;
  yield?: string;
  cuisine?: string;
  course?: string;
  keywords?: string[];
  nutrition?: {
    calories?: string;
    fat?: string;
    saturatedFat?: string;
    carbohydrates?: string;
    sugar?: string;
    protein?: string;
    fiber?: string;
    sodium?: string;
  };
  ingredients?: {
    group_title?: string;
    items: {
      name: string;
      amount?: string;
      unit?: string;
      notes?: string;
    }[];
  }[];
  instructions?: {
    section_title?: string;
    steps: {
      text: string;
      time?: number;
      tip?: string;
      image?: string | null;
    }[];
  }[];
  equipment?: string[]; // Equipment slugs
  notes?: string;
  video?: {
    url: string;
    duration?: string;
  };
}

/** FAQ item for articles */
export interface FaqItem {
  question: string;
  answer: string;
}

// ============================================================================
// ENTITY TYPES (Aligned with schema.ts)
// ============================================================================

/**
 * Category entity
 * @see db/schema.sql lines 251-469
 */
export interface Category {
  id: number;
  
  // Navigation & Hierarchy
  slug: string;
  label: string; // Display name (NOT 'name')
  parentId?: number | null;
  depth?: number;
  
  // Display Text
  headline?: string | null;
  collectionTitle?: string | null;
  shortDescription?: string | null;
  
  // Visuals
  imagesJson?: string | null; // JSON string of ImagesJson
  color?: string | null; // Hex with alpha: #ff6600ff
  iconSvg?: string | null;
  
  // Flags
  isFeatured?: boolean;
  
  // JSON Config
  seoJson?: string | null;
  configJson?: string | null;
  i18nJson?: string | null;
  
  // System
  sortOrder?: number;
  isOnline?: boolean;
  cachedPostCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  
  // Computed (not in DB)
  route?: string;
}

/**
 * Author entity
 * @see db/schema.sql lines 492-690
 */
export interface Author {
  id: number;
  
  // Identity
  slug: string;
  name: string;
  email?: string | null;
  
  // Display Metadata
  jobTitle?: string | null;
  role?: 'guest' | 'staff' | 'editor' | 'admin' | string;
  headline?: string | null;
  subtitle?: string | null;
  shortDescription?: string | null;
  excerpt?: string | null;
  introduction?: string | null;
  
  // Visuals
  imagesJson?: string | null; // JSON string of ImagesJson (avatar + cover)
  
  // Bio & Socials
  bioJson?: string | null; // JSON string of BioJson
  
  // SEO
  seoJson?: string | null;
  
  // System
  cachedPostCount?: number;
  isFeatured?: boolean;
  sortOrder?: number;
  isOnline?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  
  // Computed
  route?: string;
}

/**
 * Tag entity
 */
export interface Tag {
  id: number;
  slug: string;
  label: string;
  description?: string | null;
  filterGroupsJson?: string | null; // Array of filter group names
  styleJson?: string | null; // JSON string of TagStyleJson
  cachedPostCount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  
  // Computed
  route?: string;
}

/**
 * Equipment entity
 */
export interface Equipment {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null; // 'appliances' | 'cookware' | 'bakeware' | 'tools'
  imageJson?: string | null;
  affiliateUrl?: string | null;
  affiliateProvider?: string | null;
  affiliateNote?: string | null;
  priceDisplay?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

/**
 * Media entity (centralized asset library)
 */
export interface Media {
  id: number;
  name: string;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  mimeType: string;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  dominantColor?: string | null;
  variantsJson: string; // Required - JSON string of ImageVariants
  folder?: string | null;
  tagsJson?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

/**
 * Article entity (articles, recipes, roundups)
 */
export interface Article {
  id: number;
  slug: string;
  type: 'article' | 'recipe' | 'roundup' | string;
  locale?: string;
  
  // Relations (FK IDs)
  categoryId: number;
  authorId: number;
  parentArticleId?: number | null;
  
  // Display Metadata
  headline: string;
  subtitle?: string | null;
  shortDescription: string;
  excerpt?: string | null;
  introduction?: string | null;
  
  // Content (JSON strings)
  imagesJson?: string | null;
  contentJson?: string | null;
  recipeJson?: string | null; // JSON string of RecipeJson
  roundupJson?: string | null;
  faqsJson?: string | null; // JSON string of FaqItem[]
  
  // Cached Fields (Zero-Join)
  relatedArticlesJson?: string | null;
  cachedTagsJson?: string | null;
  cachedCategoryJson?: string | null;
  cachedAuthorJson?: string | null;
  cachedEquipmentJson?: string | null;
  cachedCommentCount?: number;
  cachedRatingJson?: string | null;
  cachedTocJson?: string | null;
  cachedRecipeJson?: string | null;
  cachedCardJson?: string | null;
  readingTimeMinutes?: number | null;
  
  // Scalar Indexes
  totalTimeMinutes?: number | null;
  difficultyLabel?: string | null;
  
  // SEO & Config
  seoJson?: string | null;
  jsonldJson?: string | null;
  configJson?: string | null;
  
  // Workflow
  workflowStatus?: 'draft' | 'in_review' | 'scheduled' | 'published' | 'archived' | string;
  scheduledAt?: string | null;
  
  // System
  isOnline?: boolean;
  isFavorite?: boolean;
  accessLevel?: number;
  viewCount?: number;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  
  // Joined relations (populated by queries)
  category?: Category;
  author?: Author;
  tags?: Tag[];
}

/**
 * Pinterest Board entity
 */
export interface PinterestBoard {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  boardUrl?: string | null;
  coverImageUrl?: string | null;
  locale?: string;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

/**
 * Pinterest Pin entity
 */
export interface PinterestPin {
  id: number;
  articleId?: number | null;
  boardId?: number | null;
  title: string;
  description?: string | null;
  imageUrl: string;
  pinUrl?: string | null;
  pinterestPinId?: string | null;
  status?: 'draft' | 'scheduled' | 'published' | 'failed' | string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Pin Template entity
 */
export interface PinTemplate {
  id: number;
  name: string;
  category?: string | null;
  layoutJson: string; // Fabric.js canvas JSON
  thumbnailUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Site Settings entity (key-value store)
 */
export interface SiteSetting {
  key: string;
  value: string; // JSON string
  description?: string | null;
  category?: string;
  sortOrder?: number;
  type?: 'json' | 'text' | 'number' | 'boolean' | 'image' | 'color' | 'code';
  updatedAt?: string | null;
}

/**
 * Redirect entity
 */
export interface Redirect {
  id: number;
  fromPath: string;
  toPath: string;
  statusCode?: number; // 301 or 302
  isActive?: boolean;
  createdAt?: string | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

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

// ============================================================================
// PARSED JSON TYPES (for frontend use after JSON.parse)
// ============================================================================

/** Parsed category with typed JSON fields */
export interface ParsedCategory extends Omit<Category, 'imagesJson' | 'seoJson' | 'configJson' | 'i18nJson'> {
  images?: ImagesJson;
  seo?: SeoJson;
  config?: ConfigJson;
  i18n?: Record<string, { label?: string; headline?: string }>;
}

/** Parsed author with typed JSON fields */
export interface ParsedAuthor extends Omit<Author, 'imagesJson' | 'bioJson' | 'seoJson'> {
  images?: ImagesJson;
  bio?: BioJson;
  seo?: SeoJson;
}

/** Parsed article with typed JSON fields */
export interface ParsedArticle extends Omit<Article, 'recipeJson' | 'faqsJson' | 'imagesJson' | 'seoJson'> {
  images?: ImagesJson;
  recipe?: RecipeJson;
  faqs?: FaqItem[];
  seo?: SeoJson;
}
