import React, { createContext, useContext } from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { Utensils } from 'lucide-react';
import RecipeBuilder from "../../RecipeBuilder";
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';

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

            const moveBlockUp = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksUp();
                editor.focus();
            };

            const moveBlockDown = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksDown();
                editor.focus();
            };

            const sideMenu = editor.extensions?.sideMenu;
            const handleDragStart = (event) => {
                sideMenu?.blockDragStart?.(event, block);
            };
            const handleDragEnd = () => {
                sideMenu?.blockDragEnd?.();
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={Utensils}
                    blockLabel="Recipe"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
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
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="main-recipe"
                    blockId={block.id}
                    className="my-4"
                >
                    <div className="wp-main-recipe-block">
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
