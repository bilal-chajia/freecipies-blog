import React, { createContext, useContext } from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import RecipeBuilder from "../../RecipeBuilder";

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
            const { recipe, setRecipe } = useRecipeData();

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
                <div className="wp-main-recipe-block my-4">
                    <RecipeBuilder
                        value={recipe}
                        onChange={(newValue) => {
                            setRecipe(newValue);
                        }}
                    />
                </div>
            );
        }
    }
);
