/**
 * Block settings panels — single source of truth for sidebar settings wiring.
 *
 * Maps an editor block type to the render function for its settings panel.
 * Both BlockSettingsRouter (what to render) and BlockSettings (`handledTypes`,
 * i.e. whether to show the generic fallback) derive from this map, so adding a
 * block's settings is a single entry here instead of editing two files.
 *
 * This is the UI-side companion to blocks/registry.ts: the leaf registry owns
 * block identity/conversion/schema, this owns the (React-heavy) settings panels.
 */
import type { ReactNode } from 'react';
import { CUSTOM_EDITOR_TYPES } from '../../blocks/registry';
import RecipeSettingsSidebar from './RecipeSettingsSidebar';
import RoundupListSettings from './RoundupListSettings';
import HeadingSettings from './HeadingSettings';
import ParagraphSettings from './ParagraphSettings';
import AlertSettings from './AlertSettings';
import DividerSettings from './DividerSettings';
import FAQSettings from './FAQSettings';
import VideoSettings from './VideoSettings';
import TableSettings from './TableSettings';
import ImageSettings from './ImageSettings';
import BeforeAfterSettings from './BeforeAfterSettings';
import RelatedContentSettings from './RelatedContentSettings';

export interface BlockSettingsPanelProps {
  selectedBlock: any;
  updateProps: (props: Record<string, unknown>) => void;
  recipeData?: any;
  onRecipeChange?: (recipe: any) => void;
  relatedContext?: any;
  imagesData?: unknown;
  onImagesChange?: (next: unknown) => void;
}

export const BLOCK_SETTINGS_PANELS: Record<
  string,
  (props: BlockSettingsPanelProps) => ReactNode
> = {
  mainRecipe: ({ recipeData, onRecipeChange }) => (
    <RecipeSettingsSidebar recipe={recipeData} setRecipe={onRecipeChange} />
  ),
  roundupList: ({ selectedBlock, updateProps }) => (
    <RoundupListSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  heading: ({ selectedBlock, updateProps }) => (
    <HeadingSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  paragraph: ({ selectedBlock, updateProps }) => (
    <ParagraphSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  alert: ({ selectedBlock, updateProps }) => (
    <AlertSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  divider: ({ selectedBlock, updateProps }) => (
    <DividerSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  faqSection: ({ selectedBlock, updateProps }) => (
    <FAQSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  video: ({ selectedBlock, updateProps }) => (
    <VideoSettings selectedBlock={selectedBlock} updateProps={updateProps} />
  ),
  simpleTable: ({ selectedBlock }) => (
    <TableSettings selectedBlock={selectedBlock} />
  ),
  customImage: ({ selectedBlock, updateProps, imagesData, onImagesChange }) => (
    <ImageSettings
      selectedBlock={selectedBlock}
      updateProps={updateProps}
      imagesData={imagesData}
      onImagesChange={onImagesChange}
    />
  ),
  beforeAfter: ({ selectedBlock, updateProps, imagesData, onImagesChange }) => (
    <BeforeAfterSettings
      selectedBlock={selectedBlock}
      updateProps={updateProps}
      imagesData={imagesData}
      onImagesChange={onImagesChange}
    />
  ),
  relatedContent: ({ selectedBlock, relatedContext, updateProps }) => (
    <RelatedContentSettings
      selectedBlock={selectedBlock}
      relatedContext={relatedContext}
      updateProps={updateProps}
    />
  ),
};

/** Editor block types with a dedicated settings panel. */
export const SETTINGS_PANEL_TYPES = new Set(Object.keys(BLOCK_SETTINGS_PANELS));

if (import.meta.env?.DEV) {
  // Guard: every custom block in the registry should have a settings panel.
  const missing = CUSTOM_EDITOR_TYPES.filter((t) => !SETTINGS_PANEL_TYPES.has(t));
  if (missing.length) {
    console.error('[block-settings] Custom blocks without a settings panel:', missing);
  }
}
