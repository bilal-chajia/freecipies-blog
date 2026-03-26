import React, { createContext, useContext } from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { Utensils } from 'lucide-react';
import RecipeBuilder from "../../RecipeBuilder";
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';

/**
 * Context to share recipe data between the BlockEditor and MainRecipeBlock
 */
export const RecipeDataContext = createContext({
    recipe: null,
    setRecipe: () => { },
});

export const useRecipeData = () => useContext(RecipeDataContext);

/**
 * MainRecipeBlock
 * 
 * A BlockNote custom block that renders the full RecipeBuilder.
 * It uses the RecipeDataContext to sync data with the parent editor.
 */
export const MainRecipeBlock = createReactBlockSpec(
    {
        type: "mainRecipe",
        propSchema: {},
        content: "none",
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const { recipe, setRecipe } = useRecipeData();
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

            if (!recipe && !setRecipe) {
                return (
                    <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center">
                        <p className="text-sm text-muted-foreground">
                            Recipe data context not found.
                        </p>
                    </div>
                );
            }

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
                            onChange={(newValue) => {
                                setRecipe(newValue);
                            }}
                        />
                    </div>
                </BlockWrapper>
            );
        }
    }
);




