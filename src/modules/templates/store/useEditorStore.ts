// @ts-nocheck
import { create } from 'zustand';

// Canvas constants
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1500;
export const GRID_SIZE = 20;
export const SNAP_THRESHOLD = 8;

/**
 * useEditorStore - Zustand store for template editor state
 * Manages: template, elements, selection, history (undo/redo), custom fonts, UI state
 */
const useEditorStore = create((set, get) => ({
    // === TEMPLATE STATE ===
    template: {
        name: '',
        background_color: '#ffffff',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
    },
    elements: [],

    // === SELECTION STATE ===
    selectedIds: new Set(),

    // === HISTORY STATE (Undo/Redo) ===
    history: {
        past: [],
        future: [],
    },

    // === UI STATE ===
    zoom: 100,
    showGrid: false,
    activeTab: null,
    activePanel: 'default', // 'default' | 'effects'
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,

    // === CUSTOM FONTS STATE ===
    customFonts: (() => {
        if (typeof localStorage !== 'undefined') {
            try {
                return JSON.parse(localStorage.getItem('admin_custom_fonts') || '[]');
            } catch (e) {
                return [];
            }
        }
        return [];
    })(),

    // === TEMPLATE ACTIONS ===
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
            selectedIds: new Set(),
            hasUnsavedChanges: false,
            history: { past: [], future: [] },
        });
    },

    loadTemplateToStore: (templateData, elementsJson) => {
        // Parse elements if they come as JSON string
        let parsedElements = [];
        if (typeof elementsJson === 'string') {
            try {
                parsedElements = JSON.parse(elementsJson);
            } catch (e) {
                console.error('Failed to parse elements_json:', e);
                parsedElements = [];
            }
        } else if (Array.isArray(elementsJson)) {
            parsedElements = elementsJson;
        }

        set({
            template: { ...templateData },
            elements: parsedElements,
            selectedIds: new Set(),
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
                width: 1000,
                height: 1500,
            },
            elements: [],
            selectedIds: new Set(),
            hasUnsavedChanges: false,
            history: { past: [], future: [] },
        });
    },

    // === ELEMENT ACTIONS ===
    setElements: (elements) => {
        // User-driven bulk replace (e.g., resize canvas) should be undoable
        get().saveHistory();
        set({ elements, hasUnsavedChanges: true });
    },

    addElement: (type, defaults = {}) => {
        const { elements } = get();
        const newElement = {
            id: `${type}-${Date.now()}`,
            type,
            x: 100,
            y: 100,
            width: 200,
            height: type === 'text' ? 50 : 200,
            rotation: 0,
            locked: false,
            ...defaults,
        };

        // Save history for undo
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
            elements: elements.map(el =>
                el.id === id ? { ...el, ...updates } : el
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
            elements: elements.filter(el => el.id !== id),
            selectedIds: newSelectedIds,
            hasUnsavedChanges: true,
        });
    },

    deleteSelected: () => {
        const { elements, selectedIds } = get();
        if (selectedIds.size === 0) return;
        get().saveHistory();
        set({
            elements: elements.filter(el => !selectedIds.has(el.id)),
            selectedIds: new Set(),
            hasUnsavedChanges: true,
        });
    },

    duplicateSelected: () => {
        const { elements, selectedIds } = get();
        if (selectedIds.size === 0) return;
        get().saveHistory();

        const newElements = [];
        const newIds = new Set();

        elements.forEach(el => {
            if (selectedIds.has(el.id)) {
                const newId = `${el.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                newElements.push({
                    ...el,
                    id: newId,
                    x: el.x + 20,
                    y: el.y + 20,
                });
                newIds.add(newId);
            }
        });

        set({
            elements: [...elements, ...newElements],
            selectedIds: newIds,
            hasUnsavedChanges: true,
        });
    },

    // === SELECTION ACTIONS ===
    selectElement: (id) => {
        set({ selectedIds: id ? new Set([id]) : new Set() });
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
        ids.forEach(id => newSelection.add(id));
        set({ selectedIds: newSelection });
    },

    clearSelection: () => {
        set({ selectedIds: new Set() });
    },

    getFirstSelectedElement: () => {
        const { elements, selectedIds } = get();
        if (selectedIds.size === 0) return null;
        const firstId = Array.from(selectedIds)[0];
        return elements.find(el => el.id === firstId) || null;
    },

    // === LAYER ACTIONS ===
    moveElementUp: (id) => {
        const { elements } = get();
        const index = elements.findIndex(el => el.id === id);
        if (index < elements.length - 1) {
            get().saveHistory();
            const updated = [...elements];
            [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
            set({ elements: updated, hasUnsavedChanges: true });
        }
    },

    moveElementDown: (id) => {
        const { elements } = get();
        const index = elements.findIndex(el => el.id === id);
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
            elements: elements.map(el =>
                el.id === id ? { ...el, locked: !el.locked } : el
            ),
            hasUnsavedChanges: true,
        });
    },

    bringToFront: (id) => {
        const { elements } = get();
        const index = elements.findIndex(el => el.id === id);
        if (index >= 0 && index < elements.length - 1) {
            get().saveHistory();
            const element = elements[index];
            const updated = [
                ...elements.slice(0, index),
                ...elements.slice(index + 1),
                element
            ];
            set({ elements: updated, hasUnsavedChanges: true });
        }
    },

    sendToBack: (id) => {
        const { elements } = get();
        const index = elements.findIndex(el => el.id === id);
        if (index > 0) {
            get().saveHistory();
            const element = elements[index];
            const updated = [
                element,
                ...elements.slice(0, index),
                ...elements.slice(index + 1)
            ];
            set({ elements: updated, hasUnsavedChanges: true });
        }
    },

    // === HISTORY ACTIONS ===
    saveHistory: () => {
        const { elements, history } = get();
        // Clone elements to avoid mutation of history entries
        const snapshot = elements.map(el => ({ ...el }));
        set({
            history: {
                past: [...history.past, snapshot].slice(-50), // Keep last 50
                future: [],
            },
        });
    },

    undo: () => {
        const { elements, history } = get();
        if (history.past.length === 0) return;

        const previous = history.past[history.past.length - 1];
        const currentSnapshot = elements.map(el => ({ ...el }));

        set({
            elements: previous.map(el => ({ ...el })), // clone to avoid shared refs
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
        const currentSnapshot = elements.map(el => ({ ...el }));

        set({
            elements: next.map(el => ({ ...el })), // clone to avoid shared refs
            history: {
                past: [...history.past, currentSnapshot],
                future: history.future.slice(1),
            },
            hasUnsavedChanges: true,
        });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,

    // === CUSTOM FONTS ACTIONS ===
    addCustomFont: (font) => {
        const { customFonts } = get();
        // Prevent duplicates by checking if font with same name exists
        if (customFonts.some(f => f.name === font.name)) {
            console.log(`Font "${font.name}" already exists, skipping duplicate.`);
            return;
        }
        const newFonts = [...customFonts, font];
        set({ customFonts: newFonts });
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('admin_custom_fonts', JSON.stringify(newFonts));
        }
    },

    removeCustomFont: (name) => {
        const { customFonts } = get();
        const newFonts = customFonts.filter(f => f.name !== name);
        set({ customFonts: newFonts });
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('admin_custom_fonts', JSON.stringify(newFonts));
        }
    },

    // === UI ACTIONS ===
    setZoom: (zoom) => set({ zoom }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setActiveTab: (tab) => set({ activeTab: tab }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    setLoading: (isLoading) => set({ isLoading }),
    setSaving: (isSaving) => set({ isSaving }),
    markSaved: () => set({ hasUnsavedChanges: false }),
}));

export default useEditorStore;
