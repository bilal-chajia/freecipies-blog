import type { BlockAdapter } from '../BlockAdapter';
import type { MainRecipeBlock as MainRecipeBlockType } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

/**
 * Adapter for the canonical main_recipe position marker.
 * Recipe data stays in recipeJson; content_json stores only the block position.
 */
export const MainRecipeAdapter: BlockAdapter<MainRecipeBlockType> = {
  type: 'main_recipe',

  toEditor(): Partial<AppBlock> {
    return {
      type: 'mainRecipe',
      props: {},
    };
  },

  fromEditor(): MainRecipeBlockType {
    return {
      type: 'main_recipe',
    };
  },
};
