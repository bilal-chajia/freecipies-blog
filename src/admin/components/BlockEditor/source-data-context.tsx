import { createContext, useContext } from 'react';

export interface BlockEditorSourceData {
  recipeJson?: unknown;
  onRecipeChange?: (nextValue: string) => void;
  faqsJson?: unknown;
  onFaqsChange?: (nextValue: string) => void;
  imagesData?: unknown;
  onImagesChange?: (nextValue: unknown) => void;
  roundupJson?: unknown;
}

const BlockEditorSourceDataContext = createContext<BlockEditorSourceData>({});

export const BlockEditorSourceDataProvider = BlockEditorSourceDataContext.Provider;

export function useBlockEditorSourceData(): BlockEditorSourceData {
  return useContext(BlockEditorSourceDataContext);
}
