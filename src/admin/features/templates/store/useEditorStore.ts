/**
 * Template Editor Store - Zustand
 * ================================
 * Strictly typed, performance-optimized state management.
 *
 * Optimizations:
 * - subscribeWithSelector for atomic subscriptions
 * - structuredClone for history snapshots (deep immutable)
 * - crypto.randomUUID for collision-free IDs
 * - Stable action references
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { parseStoredTemplateElements } from '@modules/templates/utils';

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1500;
export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 8;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

import {
  type ElementType,
  type TemplateElement,
  type TextShadow,
  type TextEffect,
  type TextBackground,
  type TextElement,
  type ImageSlotElement,
  type ShapeElement,
  type LogoElement,
  type OverlayElement,
} from '@modules/templates/types';

/** Editor alias for the canonical element union (kept for existing importers). */
export type EditorElement = TemplateElement;
export type {
  ElementType,
  TextShadow,
  TextEffect,
  TextBackground,
  TextElement,
  ImageSlotElement,
  ShapeElement,
  LogoElement,
  OverlayElement,
};

export interface CustomFont {
  name: string;
  url: string;
}

export interface TemplateState {
  id?: number | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  background_color: string;
  width: number;
  height: number;
  canvas_width?: number;
  canvas_height?: number;
  thumbnail_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  elements_json?: string | EditorElement[] | null;
}

export interface HistoryState {
  past: EditorElement[][];
  future: EditorElement[][];
}

export interface EditorState {
  template: TemplateState;
  elements: EditorElement[];
  selectedIds: Set<string>;
  history: HistoryState;
  zoom: number;
  showGrid: boolean;
  activeTab: string | null;
  activePanel: 'default' | 'effects';
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  customFonts: CustomFont[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadCustomFontsFromStorage(): CustomFont[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('admin_custom_fonts') || '[]');
  } catch {
    return [];
  }
}

function persistCustomFonts(fonts: CustomFont[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('admin_custom_fonts', JSON.stringify(fonts));
}

const DEFAULT_TEMPLATE: TemplateState = {
  name: '',
  background_color: '#ffffff',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

interface EditorActions {
  setTemplate: (updates: Partial<TemplateState>) => void;
  initTemplate: (template: TemplateState, elements: EditorElement[]) => void;
  loadTemplateToStore: (templateData: Partial<TemplateState>, elements_json: string | EditorElement[]) => void;
  resetTemplate: () => void;
  setElements: (elements: EditorElement[]) => void;
  addElement: (type: ElementType, defaults?: Partial<EditorElement>) => EditorElement;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  selectElement: (id: string | null) => void;
  toggleSelection: (id: string) => void;
  addToSelection: (ids: string[]) => void;
  clearSelection: () => void;
  getFirstSelectedElement: () => EditorElement | null;
  moveElementUp: (id: string) => void;
  moveElementDown: (id: string) => void;
  reorderElements: (newOrder: EditorElement[]) => void;
  toggleLock: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addCustomFont: (font: CustomFont) => void;
  removeCustomFont: (name: string) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setActiveTab: (tab: string | null) => void;
  setActivePanel: (panel: 'default' | 'effects') => void;
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  markSaved: () => void;
}

const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    /* ------------------- State ------------------- */
    template: { ...DEFAULT_TEMPLATE },
    elements: [],
    selectedIds: new Set<string>(),
    history: { past: [], future: [] },
    zoom: 100,
    showGrid: false,
    activeTab: null,
    activePanel: 'default',
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    customFonts: loadCustomFontsFromStorage(),

    /* ------------------- Template Actions ------------------- */
    setTemplate: (updates) => {
      set((state) => ({
        template: { ...state.template, ...updates },
        hasUnsavedChanges: true,
      }));
    },

    initTemplate: (template, elements) => {
      set({
        template: { ...template },
        elements: elements || [],
        selectedIds: new Set<string>(),
        hasUnsavedChanges: false,
        history: { past: [], future: [] },
      });
    },

    loadTemplateToStore: (templateData, elements_json) => {
      const parsedElements = parseStoredTemplateElements(elements_json);

      set({
        template: { ...get().template, ...templateData },
        elements: parsedElements,
        selectedIds: new Set<string>(),
        hasUnsavedChanges: false,
        isLoading: false,
        history: { past: [], future: [] },
      });
    },

    resetTemplate: () => {
      set({
        template: {
          id: null,
          slug: null,
          name: '',
          background_color: '#ffffff',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
        },
        elements: [],
        selectedIds: new Set<string>(),
        hasUnsavedChanges: false,
        history: { past: [], future: [] },
      });
    },

    /* ------------------- Element Actions ------------------- */
    setElements: (elements) => {
      get().saveHistory();
      set({ elements, hasUnsavedChanges: true });
    },

    addElement: (type, defaults = {}) => {
      const { elements } = get();
      const newElement: EditorElement = {
        id: generateId(type),
        type,
        x: 100,
        y: 100,
        width: 200,
        height: type === 'text' ? 50 : 200,
        rotation: 0,
        locked: false,
        ...defaults,
      } as EditorElement;

      get().saveHistory();

      set({
        elements: [...elements, newElement],
        selectedIds: new Set([newElement.id]),
        hasUnsavedChanges: true,
      });

      return newElement;
    },

    updateElement: (id, updates) => {
      const { elements } = get();
      get().saveHistory();
      set({
        elements: elements.map((el) =>
          el.id === id ? ({ ...el, ...updates } as EditorElement) : el
        ),
        hasUnsavedChanges: true,
      });
    },

    deleteElement: (id) => {
      const { elements, selectedIds } = get();
      get().saveHistory();
      const newSelectedIds = new Set(selectedIds);
      newSelectedIds.delete(id);
      set({
        elements: elements.filter((el) => el.id !== id),
        selectedIds: newSelectedIds,
        hasUnsavedChanges: true,
      });
    },

    deleteSelected: () => {
      const { elements, selectedIds } = get();
      if (selectedIds.size === 0) return;
      get().saveHistory();
      set({
        elements: elements.filter((el) => !selectedIds.has(el.id)),
        selectedIds: new Set<string>(),
        hasUnsavedChanges: true,
      });
    },

    duplicateSelected: () => {
      const { elements, selectedIds } = get();
      if (selectedIds.size === 0) return;
      get().saveHistory();

      const newElements: EditorElement[] = [];
      const newIds = new Set<string>();

      elements.forEach((el) => {
        if (selectedIds.has(el.id)) {
          const newId = generateId(el.type);
          newElements.push({
            ...el,
            id: newId,
            x: el.x + 20,
            y: el.y + 20,
          } as EditorElement);
          newIds.add(newId);
        }
      });

      set({
        elements: [...elements, ...newElements],
        selectedIds: newIds,
        hasUnsavedChanges: true,
      });
    },

    /* ------------------- Selection Actions ------------------- */
    selectElement: (id) => {
      set({ selectedIds: id ? new Set([id]) : new Set<string>() });
    },

    toggleSelection: (id) => {
      const { selectedIds } = get();
      const newSelection = new Set(selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      set({ selectedIds: newSelection });
    },

    addToSelection: (ids) => {
      const { selectedIds } = get();
      const newSelection = new Set(selectedIds);
      ids.forEach((id) => newSelection.add(id));
      set({ selectedIds: newSelection });
    },

    clearSelection: () => {
      set({ selectedIds: new Set<string>() });
    },

    getFirstSelectedElement: () => {
      const { elements, selectedIds } = get();
      if (selectedIds.size === 0) return null;
      const firstId = Array.from(selectedIds)[0];
      return elements.find((el) => el.id === firstId) || null;
    },

    /* ------------------- Layer Actions ------------------- */
    moveElementUp: (id) => {
      const { elements } = get();
      const index = elements.findIndex((el) => el.id === id);
      if (index >= 0 && index < elements.length - 1) {
        get().saveHistory();
        const updated = [...elements];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        set({ elements: updated, hasUnsavedChanges: true });
      }
    },

    moveElementDown: (id) => {
      const { elements } = get();
      const index = elements.findIndex((el) => el.id === id);
      if (index > 0) {
        get().saveHistory();
        const updated = [...elements];
        [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
        set({ elements: updated, hasUnsavedChanges: true });
      }
    },

    reorderElements: (newOrder) => {
      get().saveHistory();
      set({ elements: newOrder, hasUnsavedChanges: true });
    },

    toggleLock: (id) => {
      const { elements } = get();
      set({
        elements: elements.map((el) =>
          el.id === id ? ({ ...el, locked: !el.locked } as EditorElement) : el
        ),
        hasUnsavedChanges: true,
      });
    },

    bringToFront: (id) => {
      const { elements } = get();
      const index = elements.findIndex((el) => el.id === id);
      if (index >= 0 && index < elements.length - 1) {
        get().saveHistory();
        const element = elements[index];
        const updated = [
          ...elements.slice(0, index),
          ...elements.slice(index + 1),
          element,
        ];
        set({ elements: updated, hasUnsavedChanges: true });
      }
    },

    sendToBack: (id) => {
      const { elements } = get();
      const index = elements.findIndex((el) => el.id === id);
      if (index > 0) {
        get().saveHistory();
        const element = elements[index];
        const updated = [element, ...elements.slice(0, index), ...elements.slice(index + 1)];
        set({ elements: updated, hasUnsavedChanges: true });
      }
    },

    /* ------------------- History Actions ------------------- */
    saveHistory: () => {
      const { elements, history } = get();
      const snapshot = structuredClone(elements);
      set({
        history: {
          past: [...history.past, snapshot].slice(-20),
          future: [],
        },
      });
    },

    undo: () => {
      const { elements, history } = get();
      if (history.past.length === 0) return;

      const previous = history.past[history.past.length - 1];
      const currentSnapshot = structuredClone(elements);

      set({
        elements: structuredClone(previous),
        history: {
          past: history.past.slice(0, -1),
          future: [currentSnapshot, ...history.future],
        },
        hasUnsavedChanges: true,
      });
    },

    redo: () => {
      const { elements, history } = get();
      if (history.future.length === 0) return;

      const next = history.future[0];
      const currentSnapshot = structuredClone(elements);

      set({
        elements: structuredClone(next),
        history: {
          past: [...history.past, currentSnapshot],
          future: history.future.slice(1),
        },
        hasUnsavedChanges: true,
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    /* ------------------- Custom Fonts ------------------- */
    addCustomFont: (font) => {
      const { customFonts } = get();
      if (customFonts.some((f) => f.name === font.name)) return;
      const newFonts = [...customFonts, font];
      set({ customFonts: newFonts });
      persistCustomFonts(newFonts);
    },

    removeCustomFont: (name) => {
      const { customFonts } = get();
      const newFonts = customFonts.filter((f) => f.name !== name);
      set({ customFonts: newFonts });
      persistCustomFonts(newFonts);
    },

    /* ------------------- UI Actions ------------------- */
    setZoom: (zoom) => set({ zoom }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    setLoading: (isLoading) => set({ isLoading }),
    setSaving: (isSaving) => set({ isSaving }),
    markSaved: () => set({ hasUnsavedChanges: false }),
  }))
);

/* ------------------------------------------------------------------ */
/*  Atomic selectors (stable, prevent unnecessary re-renders)         */
/* ------------------------------------------------------------------ */

export function useTemplate(): TemplateState {
  return useEditorStore((state) => state.template);
}

export function useElements(): EditorElement[] {
  return useEditorStore((state) => state.elements);
}

export function useSelectedIds(): Set<string> {
  return useEditorStore((state) => state.selectedIds);
}

export function useZoom(): number {
  return useEditorStore((state) => state.zoom);
}

export function useShowGrid(): boolean {
  return useEditorStore((state) => state.showGrid);
}

export function useIsLoading(): boolean {
  return useEditorStore((state) => state.isLoading);
}

export function useIsSaving(): boolean {
  return useEditorStore((state) => state.isSaving);
}

export function useHasUnsavedChanges(): boolean {
  return useEditorStore((state) => state.hasUnsavedChanges);
}

export function useCustomFonts(): CustomFont[] {
  return useEditorStore((state) => state.customFonts);
}

export function useFirstSelectedElement(): EditorElement | null {
  return useEditorStore((state) => state.getFirstSelectedElement());
}

export function useCanUndo(): boolean {
  return useEditorStore((state) => state.canUndo());
}

export function useCanRedo(): boolean {
  return useEditorStore((state) => state.canRedo());
}

export function useEditorShallow<T>(selector: (state: EditorState & EditorActions) => T): T {
  return useEditorStore(useShallow(selector));
}

export default useEditorStore;
