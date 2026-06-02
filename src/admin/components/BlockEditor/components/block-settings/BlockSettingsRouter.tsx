import { BLOCK_SETTINGS_PANELS } from './panels';

interface BlockSettingsRouterProps {
  selectedBlock: any;
  updateProps: (props: Record<string, unknown>) => void;
  recipeData?: any;
  onRecipeChange?: (recipe: any) => void;
  relatedContext?: any;
  imagesData?: unknown;
  onImagesChange?: (next: unknown) => void;
  children?: React.ReactNode;
}

export function BlockSettingsRouter({
  selectedBlock,
  updateProps,
  recipeData,
  onRecipeChange,
  relatedContext,
  imagesData,
  onImagesChange,
  children,
}: BlockSettingsRouterProps) {
  const renderPanel = BLOCK_SETTINGS_PANELS[selectedBlock.type];

  if (renderPanel) {
    return <>{renderPanel({ selectedBlock, updateProps, recipeData, onRecipeChange, relatedContext, imagesData, onImagesChange })}</>;
  }

  return <>{children}</>;
}

export default BlockSettingsRouter;
