import type { BlockAdapter } from '../BlockAdapter';
import type { MainRecipeBlock as MainRecipeBlockType } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

/**
 * Adapter for mainRecipe blocks.
 * Recipe data is stored as recipeJson in block props (Phase 3: self-contained, no context).
 */
export class MainRecipeAdapter implements BlockAdapter<MainRecipeBlockType> {
  readonly blockType = 'mainRecipe';

  toBlockNote(appBlock: MainRecipeBlockType): Partial<AppBlock> {
    const recipe = appBlock.recipe;
    return {
      type: 'mainRecipe',
      props: {
        recipeJson: recipe ? JSON.stringify(recipe) : '',
      },
    };
  }

  fromBlockNote(bnBlock: AppBlock): MainRecipeBlockType {
    let recipe = null;
    try {
      recipe = bnBlock.props.recipeJson ? JSON.parse(bnBlock.props.recipeJson) : null;
    } catch {
      recipe = null;
    }

    return {
      type: 'mainRecipe',
      recipe,
    } as MainRecipeBlockType;
  }
}
