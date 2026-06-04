import type { BlockAdapter } from '../BlockAdapter';
import type { MainRecipeBlock as MainRecipeBlockType } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

/**
 * Adapter for the canonical main_recipe position marker.
 * Recipe data stays in recipe_json; content_json stores only the block position.
 */
export const MainRecipeAdapter: BlockAdapter<MainRecipeBlockType> = {
  type: 'main_recipe',

  toEditor(_block, context): Partial<AppBlock> {
    const recipe_json = typeof context?.recipe_json === 'string'
      ? context.recipe_json
      : JSON.stringify(context?.recipe_json ?? {});

    return {
      type: 'mainRecipe',
      props: {
        recipe_json,
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
