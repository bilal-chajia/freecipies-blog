import { useEffect, useCallback, useState } from 'react';
import { nanoid } from 'nanoid';

/**
 * useKeyboardShortcuts - Custom hook for canvas keyboard shortcuts
 * 
 * Handles: Delete, Copy, Paste, Duplicate, Undo, Redo, Select All, Arrow Nudge
 * 
 * @param {Object} options - Configuration object
 * @param {boolean} options.editable - Whether editing is enabled
 * @param {string|null} options.editingTextId - ID of text currently being edited (blocks shortcuts)
 * @param {Set} options.selectedIds - Set of selected element IDs
 * @param {Array} options.elements - Array of all elements
 * @param {Function} options.deleteSelected - Delete selected elements
 * @param {Function} options.duplicateSelected - Duplicate selected elements
 * @param {Function} options.undo - Undo last action
 * @param {Function} options.redo - Redo last action
 * @param {Function} options.addToSelection - Add elements to selection
 * @param {Function} options.setElements - Set elements in state
 * @param {Function} options.updateElement - Update single element properties
 * @param {Function} options.onTemplateChange - Callback when template changes
 * @param {Function} options.saveHistory - Save current elements to history stack
 */
const useKeyboardShortcuts = ({
    editable = true,
    editingTextId,
    selectedIds,
    elements,
    deleteSelected,
    duplicateSelected,
    undo,
    redo,
    addToSelection,
    setElements,
    updateElement,
    onTemplateChange,
    saveHistory,
}) => {
    // Internal clipboard state
    const [clipboard, setClipboard] = useState([]);

    // Generate unique ID for pasted elements
    const generateId = useCallback(() => `el_${nanoid(10)}`, []);

    // Handle element position change (for nudge)
    const handleNudge = useCallback((id, dx, dy) => {
        const element = elements.find(el => el.id === id);
        if (element && updateElement) {
            updateElement(id, {
                x: (element.x || 0) + dx,
                y: (element.y || 0) + dy,
            });
        }
    }, [elements, updateElement]);

    useEffect(() => {
        if (!editable) return;

        const handleKeyDown = (e) => {
            // Skip shortcuts when editing text or when focus is on an input
            if (editingTextId) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

            // Delete / Backspace - delete selected elements
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
                e.preventDefault();
                deleteSelected?.();
                return;
            }

            // Ctrl+C - Copy
            if (ctrlOrCmd && e.key === 'c' && selectedIds.size > 0) {
                e.preventDefault();
                const selectedElements = elements.filter(el => selectedIds.has(el.id));
                setClipboard(selectedElements);
                return;
            }

            // Ctrl+V - Paste
            if (ctrlOrCmd && e.key === 'v' && clipboard.length > 0) {
                e.preventDefault();
                saveHistory?.();
                const pastedElements = clipboard.map(el => ({
                    ...el,
                    id: generateId(),
                    name: `${el.name} Copy`,
                    x: (el.x || 0) + 20,
                    y: (el.y || 0) + 20,
                }));
                const newElements = [...elements, ...pastedElements];
                setElements?.(newElements);
                onTemplateChange?.(newElements);
                // Select pasted elements
                const newIds = pastedElements.map(el => el.id);
                newIds.forEach(id => addToSelection?.([id]));
                return;
            }

            // Ctrl+D - Duplicate
            if (ctrlOrCmd && e.key === 'd' && selectedIds.size > 0) {
                e.preventDefault();
                duplicateSelected?.();
                return;
            }

            // Ctrl+Z - Undo
            if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo?.();
                return;
            }

            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((ctrlOrCmd && e.key === 'y') || (ctrlOrCmd && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                redo?.();
                return;
            }

            // Ctrl+A - Select All
            if (ctrlOrCmd && e.key === 'a') {
                e.preventDefault();
                elements.forEach(el => addToSelection?.([el.id]));
                return;
            }

            // Arrow keys - Nudge selected elements
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.size > 0) {
                e.preventDefault();
                const nudgeAmount = e.shiftKey ? 10 : 1;
                const dx = e.key === 'ArrowLeft' ? -nudgeAmount : e.key === 'ArrowRight' ? nudgeAmount : 0;
                const dy = e.key === 'ArrowUp' ? -nudgeAmount : e.key === 'ArrowDown' ? nudgeAmount : 0;

                selectedIds.forEach(id => handleNudge(id, dx, dy));
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        editable,
        editingTextId,
        selectedIds,
        elements,
        clipboard,
        deleteSelected,
        duplicateSelected,
        undo,
        redo,
        addToSelection,
        setElements,
        onTemplateChange,
        generateId,
        handleNudge,
        saveHistory
    ]);

    return {
        clipboard,
        setClipboard,
    };
};

export default useKeyboardShortcuts;
