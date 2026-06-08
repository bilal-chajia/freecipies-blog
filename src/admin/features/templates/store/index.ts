/**
 * Template Module - Store Barrel Export
 */

export {
  default as useEditorStore,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  SNAP_THRESHOLD,
  useTemplate,
  useElements,
  useSelectedIds,
  useZoom,
  useShowGrid,
  useIsLoading,
  useIsSaving,
  useHasUnsavedChanges,
  useCustomFonts,
  useFirstSelectedElement,
  useCanUndo,
  useCanRedo,
  useEditorShallow,
} from './useEditorStore';

export type {
  EditorElement,
  ElementType,
  TextElement,
  ImageSlotElement,
  ShapeElement,
  LogoElement,
  OverlayElement,
  TemplateState,
  CustomFont,
  TextEffect,
  TextBackground,
} from './useEditorStore';

export { useUIStore } from './useUIStore';
