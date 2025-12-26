/**
 * Template Module - Components Barrel Export
 */

// Canvas components
export { default as PinCanvas } from './canvas/PinCanvas';
export { default as ElementPanel, AddElementPanel, FONTS } from './canvas/ElementPanel';
export { default as FloatingToolbar } from './canvas/FloatingToolbar';
export { default as CanvasToolbar } from './canvas/CanvasToolbar';
export { default as DraggableLayersList } from './canvas/DraggableLayersList';

// Modern UI components
export { default as EditorLayout } from './canvas/modern/EditorLayout';
export { default as TopToolbar } from './canvas/modern/TopToolbar';
export { default as SidePanel } from './canvas/modern/SidePanel';
export { default as ContextToolbar } from './canvas/modern/ContextToolbar';
export { default as FontsPanel } from './canvas/modern/FontsPanel';
export { default as TextEffectsPanel } from './canvas/modern/TextEffectsPanel';

// Editor pages
export { default as TemplateEditor } from './editor/TemplateEditor';
export { default as TemplatesList } from './editor/TemplatesList';

// Pins
export { default as TemplateSelector } from './pins/TemplateSelector';
