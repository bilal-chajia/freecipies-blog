import type { Article } from '../schema/articles.schema';
import type { ExtractedImage, ExtractedSeo, RecipeJson } from '@shared/utils';

export type { RecipeJson };
export type RecipeDetails = RecipeJson;

export type HydratedArticle = Omit<Article, 'recipeJson'> & ExtractedImage & ExtractedSeo & {
  recipeJson: RecipeJson | null;
  recipe: RecipeJson | null;
  label: string;
  route: string;
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


export interface ArticleImages {
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
  pinterest?: {
    url: string;
    alt?: string;
  };
}
