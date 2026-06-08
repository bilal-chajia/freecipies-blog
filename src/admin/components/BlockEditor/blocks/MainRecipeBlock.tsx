import React from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { Utensils } from 'lucide-react';
import RecipeBuilder from "../../RecipeBuilder";
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockEditorSourceData } from '../source-data-context';
import { useCustomBlock } from './useCustomBlock';

/**
 * MainRecipeBlock
 * 
 * A BlockNote custom block that renders the full RecipeBuilder.
 * Recipe data is stored directly in block props (recipe_json string).
 * No context needed — self-contained block.
 */
export const MainRecipeBlock = createReactBlockSpec(
  {
    type: "mainRecipe",
    propSchema: {
      // Recipe data stored as JSON string in block props.
      // Migrated from RecipeDataContext — block is now self-contained.
      recipe_json: { default: '' },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const { recipe_json, onRecipeChange, imagesData, onImagesChange } = useBlockEditorSourceData();
      // Source-data JSON (recipe_json) is the single source of truth (P6).
      // block.props.recipe_json is a transient hydration seed only and is never
      // read back — falling back to it would resurrect a stale recipe.
      const currentRecipeJson = typeof recipe_json === 'string'
        ? recipe_json
        : recipe_json
          ? JSON.stringify(recipe_json)
          : '{}';
      const {
        isSelected, selectBlock,
        moveUp: moveBlockUp,
        moveDown: moveBlockDown,
        remove: removeBlock,
        dragHandleProps,
        setDragNodeRef,
        dragStyle,
        isDragging,
      } = useCustomBlock(block.id, editor);

      const handleChange = (newValue: string) => {
        onRecipeChange?.(newValue);
        selectBlock();
      };

      const toolbar = (
        <BlockToolbar
          blockIcon={Utensils}
          blockLabel="Recipe"
          onMoveUp={moveBlockUp}
          onMoveDown={moveBlockDown}
          dragHandleProps={dragHandleProps}
          onDelete={removeBlock}
          showMoreMenu={false}
        />
      );

      return (
        <BlockWrapper
          ref={setDragNodeRef}
          isSelected={isSelected}
          toolbar={toolbar}
          onClick={selectBlock}
          blockType="main-recipe"
          blockId={block.id}
          className="my-4"
          data-radius="lg"
          style={{
            ...dragStyle,
            opacity: isDragging ? 0.5 : undefined,
            pointerEvents: isDragging ? 'none' : undefined,
          } as React.CSSProperties}
        >
          <div className="wp-main-recipe-block border border-border rounded-lg p-4 bg-card shadow-sm">
            <RecipeBuilder
              value={currentRecipeJson}
              onChange={handleChange}
              imagesData={imagesData}
              onImagesChange={onImagesChange}
            />
          </div>
        </BlockWrapper>
      );
    }
  }
);
