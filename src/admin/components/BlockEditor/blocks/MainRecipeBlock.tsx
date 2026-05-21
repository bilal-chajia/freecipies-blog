import React from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { Utensils } from 'lucide-react';
import RecipeBuilder from "../../RecipeBuilder";
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';

/**
 * MainRecipeBlock
 * 
 * A BlockNote custom block that renders the full RecipeBuilder.
 * Recipe data is stored directly in block props (recipeJson string).
 * No context needed — self-contained block.
 */
export const MainRecipeBlock = createReactBlockSpec(
  {
    type: "mainRecipe",
    propSchema: {
      // Recipe data stored as JSON string in block props.
      // Migrated from RecipeDataContext — block is now self-contained.
      recipeJson: { default: '' },
    },
    content: "none",
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const { isSelected, selectBlock } = useBlockSelection(block.id);
      const {
        moveUp: moveBlockUp,
        moveDown: moveBlockDown,
        remove: removeBlock,
      } = useBlockActionPrimitives({
        editor,
        blockId: block.id,
        onSelect: selectBlock,
      });
      const {
        dragHandleProps,
        setDragNodeRef,
        dragStyle,
        isDragging,
      } = useBlockDragHandle(block.id);

      // Parse recipe from props
      let recipe = null;
      try {
        recipe = block.props.recipeJson ? JSON.parse(block.props.recipeJson) : null;
      } catch {
        recipe = null;
      }

      const handleChange = (newValue) => {
        editor.updateBlock(block, {
          type: 'mainRecipe',
          props: {
            ...block.props,
            recipeJson: JSON.stringify(newValue),
          },
        });
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
          onFocus={selectBlock}
          onPointerDownCapture={selectBlock}
          blockType="main-recipe"
          blockId={block.id}
          className="my-4"
          style={{
            ...dragStyle,
            opacity: isDragging ? 0.5 : undefined,
            pointerEvents: isDragging ? 'none' : undefined,
          }}
        >
          <div className="wp-main-recipe-block border border-border rounded-lg p-4 bg-card shadow-sm">
            <RecipeBuilder
              value={recipe}
              onChange={handleChange}
            />
          </div>
        </BlockWrapper>
      );
    }
  }
);
