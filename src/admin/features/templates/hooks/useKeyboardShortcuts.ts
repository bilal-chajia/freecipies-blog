import { useEffect } from 'react';
import useEditorStore, { type EditorElement } from '../store/useEditorStore';

interface UseKeyboardShortcutsOptions {
  editable?: boolean;
  editingTextId?: string | null;
}

/**
 * useKeyboardShortcuts - Stable document listener for canvas keyboard shortcuts
 *
 * The keydown listener is registered ONCE (only editable/editingTextId are deps).
 * All mutable state is read via useEditorStore.getState() inside the handler.
 *
 * Supports: Delete, Ctrl+C/V/D/Z/Y, Ctrl+A, Arrow nudge (batched via rAF)
 */
export default function useKeyboardShortcuts({
  editable = true,
  editingTextId,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!editable) return;

    const pendingNudge = new Map<string, { x: number; y: number }>();
    let rafId: number | null = null;

    function flushNudge() {
      rafId = null;
      if (pendingNudge.size === 0) return;

      const state = useEditorStore.getState();
      const updated = state.elements.map((el) => {
        const delta = pendingNudge.get(el.id);
        if (delta) {
          return { ...el, x: (el.x ?? 0) + delta.x, y: (el.y ?? 0) + delta.y } as EditorElement;
        }
        return el;
      });

      state.setElements(updated);
      pendingNudge.clear();
    }

    function queueNudge(id: string, dx: number, dy: number) {
      const current = pendingNudge.get(id) ?? { x: 0, y: 0 };
      pendingNudge.set(id, { x: current.x + dx, y: current.y + dy });
      if (rafId === null) {
        rafId = requestAnimationFrame(flushNudge);
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block shortcuts when inline text editing is active
      if (editingTextId) return;

      // Block shortcuts when focus is on an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform?.toUpperCase().includes('MAC') ?? false;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      const {
        selectedIds,
        elements,
        deleteSelected,
        duplicateSelected,
        undo,
        redo,
        setElements,
        addToSelection,
        clearSelection,
      } = useEditorStore.getState();

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Ctrl+C — Copy selected elements to system clipboard
      if (ctrlOrCmd && e.key === 'c' && selectedIds.size > 0) {
        e.preventDefault();
        const selectedElements = elements.filter((el) => selectedIds.has(el.id));
        navigator.clipboard.writeText(JSON.stringify(selectedElements)).catch(() => {
          // Silently ignore clipboard write errors
        });
        return;
      }

      // Ctrl+V — Paste from system clipboard
      if (ctrlOrCmd && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard
          .readText()
          .then((text) => {
            try {
              const parsed = JSON.parse(text);
              if (!Array.isArray(parsed)) return;

              const state = useEditorStore.getState();
              const pasted: EditorElement[] = parsed.map((el: any) => ({
                ...el,
                id:
                  typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `el-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: el.name ? `${el.name} Copy` : el.name,
                x: (el.x ?? 0) + 20,
                y: (el.y ?? 0) + 20,
              }));

              const newElements = [...state.elements, ...pasted];
              state.setElements(newElements);
              state.clearSelection();
              state.addToSelection(pasted.map((el) => el.id));
            } catch {
              // Ignore invalid clipboard content
            }
          })
          .catch(() => {
            // Silently ignore clipboard read errors
          });
        return;
      }

      // Ctrl+D — Duplicate
      if (ctrlOrCmd && e.key === 'd' && selectedIds.size > 0) {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // Ctrl+Z — Undo
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z — Redo
      if ((ctrlOrCmd && e.key === 'y') || (ctrlOrCmd && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+A — Select All
      if (ctrlOrCmd && e.key === 'a') {
        e.preventDefault();
        clearSelection();
        addToSelection(elements.map((el) => el.id));
        return;
      }

      // Arrow keys — Nudge selected elements (batched via rAF)
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        selectedIds.size > 0
      ) {
        e.preventDefault();
        const nudgeAmount = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -nudgeAmount : e.key === 'ArrowRight' ? nudgeAmount : 0;
        const dy = e.key === 'ArrowUp' ? -nudgeAmount : e.key === 'ArrowDown' ? nudgeAmount : 0;
        selectedIds.forEach((id) => queueNudge(id, dx, dy));
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        flushNudge();
      }
    };
  }, [editable, editingTextId]);
}
