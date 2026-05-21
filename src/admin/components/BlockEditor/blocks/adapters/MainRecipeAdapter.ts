import type { BlockAdapter } from '../BlockAdapter';
import type { MainRecipeBlock as MainRecipeBlockType } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

/**
 * Adapter for the canonical main_recipe position marker.
 * Recipe data stays in recipeJson; content_json stores only the block position.
 */
export const MainRecipeAdapter: BlockAdapter<MainRecipeBlockType> = {
  type: 'main_recipe',

  toEditor(_block, context): Partial<AppBlock> {
    const recipeJson = typeof context?.recipeJson === 'string'
      ? context.recipeJson
      : JSON.stringify(context?.recipeJson ?? {});

    return {
      type: 'mainRecipe',
      props: {
        recipeJson,
      },
    };
  },

  fromEditor(block: AppBlock): MainRecipeBlockType {
    return {
      ...(typeof block.id === 'string' ? { id: block.id } : {}),
      type: 'main_recipe',
    };
  },
};
