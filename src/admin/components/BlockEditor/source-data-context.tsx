import { createContext, useContext } from 'react';

export interface BlockEditorSourceData {
  recipe_json?: unknown;
  onRecipeChange?: (nextValue: string) => void;
  faqs_json?: unknown;
  onFaqsChange?: (nextValue: string) => void;
  imagesData?: unknown;
  onImagesChange?: (nextValue: unknown) => void;
  roundup_json?: unknown;
}

const BlockEditorSourceDataContext = createContext<BlockEditorSourceData>({});

export const BlockEditorSourceDataProvider = BlockEditorSourceDataContext.Provider;

export function useBlockEditorSourceData(): BlockEditorSourceData {
  return useContext(BlockEditorSourceDataContext);
}
