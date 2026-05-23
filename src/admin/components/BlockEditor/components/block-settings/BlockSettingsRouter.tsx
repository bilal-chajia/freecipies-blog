import RecipeSettingsSidebar from './RecipeSettingsSidebar';
import RoundupListSettings from './RoundupListSettings';

interface BlockSettingsRouterProps {
  selectedBlock: any;
  updateProps: (props: Record<string, unknown>) => void;
  recipeData?: any;
  onRecipeChange?: (recipe: any) => void;
  children: React.ReactNode;
}

export function BlockSettingsRouter({
  selectedBlock,
  updateProps,
  recipeData,
  onRecipeChange,
  children,
}: BlockSettingsRouterProps) {
  if (selectedBlock.type === 'mainRecipe') {
    return <RecipeSettingsSidebar recipe={recipeData} setRecipe={onRecipeChange} />;
  }

  if (selectedBlock.type === 'roundupList') {
    return <RoundupListSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  return <>{children}</>;
}

export default BlockSettingsRouter;
