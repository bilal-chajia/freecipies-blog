import { describe, it, expect, beforeEach } from 'vitest';
import useEditorStore, { CANVAS_WIDTH, CANVAS_HEIGHT, type TextElement } from '../useEditorStore';


describe('useEditorStore', () => {
    // Reset store before each test to ensure test isolation
    beforeEach(() => {
        useEditorStore.getState().resetTemplate();
    });

    describe('Template Actions', () => {
        it('should initialize with default template state', () => {
            const state = useEditorStore.getState();
            expect(state.template).toEqual({
                id: null,
                slug: null,
                name: '',
                background_color: '#ffffff',
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
            });
            expect(state.elements).toEqual([]);
            expect(state.selectedIds.size).toBe(0);
            expect(state.hasUnsavedChanges).toBe(false);
        });

        it('should update template properties and set unsaved changes', () => {
            const store = useEditorStore.getState();
            store.setTemplate({ name: 'My New Template', background_color: '#000000' });

            const updatedState = useEditorStore.getState();
            expect(updatedState.template.name).toBe('My New Template');
            expect(updatedState.template.background_color).toBe('#000000');
            expect(updatedState.hasUnsavedChanges).toBe(true);
        });

        it('should initialize template with elements and clear history/unsaved flags', () => {
            const store = useEditorStore.getState();
            const sampleTemplate = {
                name: 'Recipe Pin',
                background_color: '#f5f5f5',
                width: 1000,
                height: 1500,
            };
            const sampleElements: any[] = [
                { id: 'text-1', type: 'text', x: 50, y: 50, width: 200, height: 50, rotation: 0, locked: false }
            ];

            store.initTemplate(sampleTemplate, sampleElements);

            const updatedState = useEditorStore.getState();
            expect(updatedState.template.name).toBe('Recipe Pin');
            expect(updatedState.elements).toHaveLength(1);
            expect(updatedState.elements[0].id).toBe('text-1');
            expect(updatedState.hasUnsavedChanges).toBe(false);
            expect(updatedState.history.past).toHaveLength(0);
            expect(updatedState.history.future).toHaveLength(0);
        });

        it('should load template and parse elements from JSON string', () => {
            const store = useEditorStore.getState();
            const sampleTemplate = {
                name: 'Json Loaded Pin',
                background_color: '#abcdef',
                width: 1000,
                height: 1500,
            };
            const elementsJson = JSON.stringify([
                { id: 'image-1', type: 'imageSlot', x: 0, y: 0, width: 500, height: 500, rotation: 0, locked: false }
            ]);

            store.loadTemplateToStore(sampleTemplate, elementsJson);

            const updatedState = useEditorStore.getState();
            expect(updatedState.template.name).toBe('Json Loaded Pin');
            expect(updatedState.elements).toHaveLength(1);
            expect(updatedState.elements[0].type).toBe('imageSlot');
            expect(updatedState.hasUnsavedChanges).toBe(false);
        });
    });

    describe('Element Actions', () => {
        it('should add an element, select it, and save history', () => {
            const store = useEditorStore.getState();
            const element = store.addElement('text', { content: 'Hello Vitest', color: '#ff0000' });

            expect(element.id).toContain('text-');
            expect(element.type).toBe('text');
            
            const state = useEditorStore.getState();
            expect(state.elements).toHaveLength(1);
            expect(state.elements[0].id).toBe(element.id);
            expect(state.selectedIds.has(element.id)).toBe(true);
            expect(state.hasUnsavedChanges).toBe(true);
            expect(state.history.past).toHaveLength(1); // Saved before adding
        });

        it('should update an element properties and save history', () => {
            const store = useEditorStore.getState();
            const element = store.addElement('shape', { width: 100, height: 100 });

            store.updateElement(element.id, { width: 250, x: 120 });

            const state = useEditorStore.getState();
            expect(state.elements[0].width).toBe(250);
            expect(state.elements[0].x).toBe(120);
            expect(state.history.past).toHaveLength(2); // Added element, updated element
        });

        it('should delete a specific element by ID', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');

            store.deleteElement(el1.id);

            const state = useEditorStore.getState();
            expect(state.elements).toHaveLength(1);
            expect(state.elements[0].id).toBe(el2.id);
            expect(state.selectedIds.has(el1.id)).toBe(false);
        });

        it('should delete selected elements', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');
            
            // Select only el1
            store.selectElement(el1.id);
            store.deleteSelected();

            const state = useEditorStore.getState();
            expect(state.elements).toHaveLength(1);
            expect(state.elements[0].id).toBe(el2.id);
            expect(state.selectedIds.size).toBe(0);
        });

        it('should duplicate selected elements with an offset and select duplicates', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('shape', { x: 50, y: 50 });
            
            store.selectElement(el1.id);
            store.duplicateSelected();

            const state = useEditorStore.getState();
            expect(state.elements).toHaveLength(2);
            
            const duplicate = state.elements[1];
            expect(duplicate.id).not.toBe(el1.id);
            expect(duplicate.type).toBe('shape');
            expect(duplicate.x).toBe(70); // x + 20
            expect(duplicate.y).toBe(70); // y + 20
            
            expect(state.selectedIds.has(duplicate.id)).toBe(true);
            expect(state.selectedIds.has(el1.id)).toBe(false); // only duplicates are selected
        });
    });

    describe('Selection Actions', () => {
        it('should select a single element or clear selection', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');

            store.selectElement(el1.id);
            expect(useEditorStore.getState().selectedIds.has(el1.id)).toBe(true);
            expect(useEditorStore.getState().selectedIds.has(el2.id)).toBe(false);

            store.selectElement(null);
            expect(useEditorStore.getState().selectedIds.size).toBe(0);
        });

        it('should toggle selection of an element', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            store.clearSelection();

            store.toggleSelection(el1.id);
            expect(useEditorStore.getState().selectedIds.has(el1.id)).toBe(true);

            store.toggleSelection(el1.id);
            expect(useEditorStore.getState().selectedIds.has(el1.id)).toBe(false);
        });

        it('should select multiple elements with addToSelection', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');

            store.clearSelection();
            store.addToSelection([el1.id, el2.id]);

            const state = useEditorStore.getState();
            expect(state.selectedIds.size).toBe(2);
            expect(state.selectedIds.has(el1.id)).toBe(true);
            expect(state.selectedIds.has(el2.id)).toBe(true);
        });

        it('should return the first selected element', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');

            store.clearSelection();
            store.addToSelection([el1.id, el2.id]);

            const firstSelected = store.getFirstSelectedElement();
            expect(firstSelected).not.toBeNull();
            expect(firstSelected?.id).toBe(el1.id);
        });
    });

    describe('Layer & Ordering Actions', () => {
        it('should swap positions when moving layers up and down', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');
            const el3 = store.addElement('overlay');

            // Initial order: [el1, el2, el3]
            expect(useEditorStore.getState().elements.map(e => e.id)).toEqual([el1.id, el2.id, el3.id]);

            // Move el2 up (swaps with el3) -> [el1, el3, el2]
            store.moveElementUp(el2.id);
            expect(useEditorStore.getState().elements.map(e => e.id)).toEqual([el1.id, el3.id, el2.id]);

            // Move el3 down (swaps with el1) -> [el3, el1, el2]
            store.moveElementDown(el3.id);
            expect(useEditorStore.getState().elements.map(e => e.id)).toEqual([el3.id, el1.id, el2.id]);
        });

        it('should bring elements to front and send to back', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');
            const el2 = store.addElement('shape');
            const el3 = store.addElement('overlay');

            // Order: [el1, el2, el3]
            // Bring el1 to front -> [el2, el3, el1]
            store.bringToFront(el1.id);
            expect(useEditorStore.getState().elements.map(e => e.id)).toEqual([el2.id, el3.id, el1.id]);

            // Send el1 to back -> [el1, el2, el3]
            store.sendToBack(el1.id);
            expect(useEditorStore.getState().elements.map(e => e.id)).toEqual([el1.id, el2.id, el3.id]);
        });

        it('should toggle element lock state', () => {
            const store = useEditorStore.getState();
            const el1 = store.addElement('text');

            expect(useEditorStore.getState().elements[0].locked).toBe(false);

            store.toggleLock(el1.id);
            expect(useEditorStore.getState().elements[0].locked).toBe(true);
        });
    });

    describe('History & Undo/Redo Actions', () => {
        it('should navigate history using undo and redo', () => {
            const store = useEditorStore.getState();
            
            // 1. Initial State: Empty elements
            expect(store.elements).toHaveLength(0);
            expect(store.canUndo()).toBe(false);
            expect(store.canRedo()).toBe(false);

            // 2. Add an element (Saves history before adding)
            const el = store.addElement('text', { content: 'Version 1' });
            expect(useEditorStore.getState().elements).toHaveLength(1);
            expect(useEditorStore.getState().canUndo()).toBe(true);
            expect(useEditorStore.getState().canRedo()).toBe(false);

            // 3. Update the element (Saves history before updating)
            store.updateElement(el.id, { content: 'Version 2' } as Partial<TextElement>);
            expect((useEditorStore.getState().elements[0] as TextElement).content).toBe('Version 2');

            // 4. Undo the update -> should go back to "Version 1"
            store.undo();
            expect((useEditorStore.getState().elements[0] as TextElement).content).toBe('Version 1');
            expect(useEditorStore.getState().canUndo()).toBe(true); // can still undo the addition
            expect(useEditorStore.getState().canRedo()).toBe(true); // can redo the update

            // 5. Undo the addition -> should go back to empty
            store.undo();
            expect(useEditorStore.getState().elements).toHaveLength(0);
            expect(useEditorStore.getState().canUndo()).toBe(false);
            expect(useEditorStore.getState().canRedo()).toBe(true);

            // 6. Redo the addition -> should restore the element with "Version 1"
            store.redo();
            expect(useEditorStore.getState().elements).toHaveLength(1);
            expect((useEditorStore.getState().elements[0] as TextElement).content).toBe('Version 1');
            expect(useEditorStore.getState().canUndo()).toBe(true);

            // 7. Redo the update -> should restore "Version 2"
            store.redo();
            expect((useEditorStore.getState().elements[0] as TextElement).content).toBe('Version 2');
        });
    });

    describe('UI Actions', () => {
        it('should update UI settings like zoom, grid and loading states', () => {
            const store = useEditorStore.getState();
            
            store.setZoom(150);
            expect(useEditorStore.getState().zoom).toBe(150);

            expect(useEditorStore.getState().showGrid).toBe(false);
            store.toggleGrid();
            expect(useEditorStore.getState().showGrid).toBe(true);

            store.setLoading(true);
            expect(useEditorStore.getState().isLoading).toBe(true);

            store.setSaving(true);
            expect(useEditorStore.getState().isSaving).toBe(true);

            store.markSaved();
            expect(useEditorStore.getState().hasUnsavedChanges).toBe(false);
        });
    });
});
