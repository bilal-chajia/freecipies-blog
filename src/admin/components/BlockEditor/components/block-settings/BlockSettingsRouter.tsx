import { BLOCK_SETTINGS_PANELS } from './panels';

interface BlockSettingsRouterProps {
  selectedBlock: any;
  updateProps: (props: Record<string, unknown>) => void;
  recipeData?: any;
  onRecipeChange?: (recipe: any) => void;
  relatedContext?: any;
  children?: React.ReactNode;
}

export function BlockSettingsRouter({
  selectedBlock,
  updateProps,
  recipeData,
  onRecipeChange,
  relatedContext,
  children,
}: BlockSettingsRouterProps) {
  const renderPanel = BLOCK_SETTINGS_PANELS[selectedBlock.type];

  if (renderPanel) {
    return <>{renderPanel({ selectedBlock, updateProps, recipeData, onRecipeChange, relatedContext })}</>;
  }

  return <>{children}</>;
}

export default BlockSettingsRouter;
