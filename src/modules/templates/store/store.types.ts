/**
 * Template Module - Store Types
 * ==============================
 * TypeScript interfaces for the Zustand editor store.
 */

import type { TemplateElement } from '../types';

// ============================================================================
// State Types
// ============================================================================

/**
 * Template state - represents the current template being edited
 */
export interface TemplateState {
    id?: number | null;
    slug?: string | null;
    name: string;
    description?: string;
    category?: string;
    background_color: string;
    width: number;
    height: number;
    canvas_width?: number;
    canvas_height?: number;
    thumbnail_url?: string | null;
    is_active?: boolean;
}

/**
 * History state for undo/redo functionality
 */
export interface HistoryState {
    past: TemplateElement[][];
    future: TemplateElement[][];
}

/**
 * Custom font definition
 */
export interface CustomFont {
    name: string;
    url?: string;
    family?: string;
}

/**
 * Active panel types
 */
export type ActivePanel = 'default' | 'effects';

// ============================================================================
// Action Types
// ============================================================================

/**
 * All store actions grouped by category
 */
export interface EditorActions {
    // Template actions
    setTemplate: (updates: Partial<TemplateState>) => void;
    initTemplate: (template: Partial<TemplateState>, elements?: TemplateElement[]) => void;
    loadTemplateToStore: (templateData: Partial<TemplateState>, elementsJson?: string | TemplateElement[]) => void;
    resetTemplate: () => void;
    setCanvasBase: (width: number, height: number) => void;

    // Element actions
    setElements: (elements: TemplateElement[]) => void;
    addElement: (type: string, defaults?: Partial<TemplateElement>) => TemplateElement;
    updateElement: (id: string, updates: Partial<TemplateElement>) => void;
    deleteElement: (id: string) => void;
    deleteSelected: () => void;
    duplicateSelected: () => void;

    // Selection actions
    selectElement: (id: string | null) => void;
    toggleSelection: (id: string) => void;
    addToSelection: (ids: string[]) => void;
    clearSelection: () => void;
    getFirstSelectedElement: () => TemplateElement | null;

    // Layer actions
    moveElementUp: (id: string) => void;
    moveElementDown: (id: string) => void;
    reorderElements: (newOrder: TemplateElement[]) => void;
    toggleLock: (id: string) => void;
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;

    // History actions
    saveHistory: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;

    // Custom fonts actions
    addCustomFont: (font: CustomFont) => void;
    removeCustomFont: (name: string) => void;

    // UI actions
    setZoom: (zoom: number) => void;
    toggleGrid: () => void;
    setActiveTab: (tab: string | null) => void;
    setActivePanel: (panel: ActivePanel) => void;
    setLoading: (isLoading: boolean) => void;
    setSaving: (isSaving: boolean) => void;
    markSaved: () => void;
}

// ============================================================================
// Combined Store Type
// ============================================================================

/**
 * Complete editor state (without actions)
 */
export interface EditorState {
    // Template state
    template: TemplateState;
    elements: TemplateElement[];
    canvasBaseWidth: number;
    canvasBaseHeight: number;

    // Selection state
    selectedIds: Set<string>;

    // History state
    history: HistoryState;

    // UI state
    zoom: number;
    showGrid: boolean;
    activeTab: string | null;
    activePanel: ActivePanel;
    isLoading: boolean;
    isSaving: boolean;
    hasUnsavedChanges: boolean;

    // Custom fonts
    customFonts: CustomFont[];
}

/**
 * Complete store type (state + actions)
 */
export type EditorStore = EditorState & EditorActions;
