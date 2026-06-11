import type { Article as DbArticle } from '../schema/articles.schema';
import type { ExtractedImage, ExtractedSeo, HydratedTag } from '@shared/utils';
import type { RecipeJson } from './recipes.types';
import type { RoundupJson } from './roundups.types';
import type { ArticleImagesJson } from './images.types';

// ============================================================================
// Core Content Types (Polymorphic)
// ============================================================================

// 1. Base Content (Common to all types)
// Represents the shared structure in the 'articles' table
export type BaseContent = Omit<DbArticle, 'recipe_json' | 'roundup_json'> & ExtractedImage & ExtractedSeo & {
  route: string;

  // Hydrated Relations — nested snake_case objects are the single source of
  // author/category data (no flat camelCase aliases; see NAMING_CONTRACT).
  category?: {
    id?: number;
    label?: string | null;
    slug?: string | null;
    color?: string | null;
  } | null;
  author?: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    role?: string | null;
    job_title?: string | null;
    avatar?: unknown;
    avatar_url?: string | null;
    bio?: string | null;
    social_links?: unknown[];
  } | null;
  tags?: HydratedTag[];
};

// 2. Specific Content Types
export interface ArticleContent extends BaseContent {
  type: 'article';
  // Standard articles might use content_json for body, no specific extra JSON
}

export interface RecipeContent extends BaseContent {
  type: 'recipe';
  recipe_json: RecipeJson | null; // Raw JSON from DB
  recipe: RecipeJson | null;     // Helper alias often used in frontend
}

export interface RoundupContent extends BaseContent {
  type: 'roundup';
  roundup_json: RoundupJson | null;
}

// 3. Union Type
export type AnyContent = ArticleContent | RecipeContent | RoundupContent;


// ============================================================================
// Backward Compatibility / Legacy Aliases
// ============================================================================

// "HydratedArticle" was confusingly used for ANY content type.
// Kept for compatibility, but mapped to the Union Type.
export type HydratedArticle = AnyContent;

export type RecipeDetails = RecipeJson;
export type ArticleImages = ArticleImagesJson;
