import type { Article as DbArticle } from '../schema/articles.schema';
import type { ExtractedImage, ExtractedSeo } from '@shared/utils';
import type { RecipeJson } from './recipes.types';
import type { RoundupJson } from './roundups.types';
import type { ArticleImagesJson } from './images.types';

// ============================================================================
// Core Content Types (Polymorphic)
// ============================================================================

// 1. Base Content (Common to all types)
// Represents the shared structure in the 'articles' table
export type BaseContent = Omit<DbArticle, 'recipeJson' | 'roundupJson'> & ExtractedImage & ExtractedSeo & {
  label: string;
  route: string;

  // Hydrated Relations
  categoryLabel?: string;
  categorySlug?: string;
  categoryColor?: string;
  authorName?: string;
  authorSlug?: string;
  category?: {
    color?: string;
    label?: string;
    slug?: string;
  };
};

// 2. Specific Content Types
export interface ArticleContent extends BaseContent {
  type: 'article';
  // Standard articles might use contentJson for body, no specific extra JSON
}

export interface RecipeContent extends BaseContent {
  type: 'recipe';
  recipeJson: RecipeJson | null; // Raw JSON from DB
  recipe: RecipeJson | null;     // Helper alias often used in frontend
}

export interface RoundupContent extends BaseContent {
  type: 'roundup';
  roundupJson: RoundupJson | null;
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
