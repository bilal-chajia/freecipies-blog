type EditorLike = unknown;

export function getEditorDomElement(editor: EditorLike): HTMLElement | null {
    if (!editor) return null;
    try {
        const domElement = (editor as { domElement?: unknown }).domElement;
        return domElement instanceof HTMLElement ? domElement : null;
    } catch {
        return null;
    }
}

export function getEditorProseMirrorView<T = unknown>(editor: EditorLike): T | null {
    if (!editor) return null;
    try {
        const view = (editor as { prosemirrorView?: unknown }).prosemirrorView;
        return view ? (view as T) : null;
    } catch {
        return null;
    }
}

interface ProseMirrorViewLike {
    state: {
        doc: unknown;
        selection: { constructor: unknown };
        tr: { setSelection(selection: unknown): unknown };
    };
    dispatch: (tr: unknown) => void;
}

/**
 * Restore a character-level text selection via the public ProseMirror view.
 *
 * Uses the live `selection.constructor` (the TextSelection class) rather than
 * reaching into the private `_tiptapEditor`, so it survives BlockNote upgrades.
 * Best-effort: returns false on any failure (e.g. out-of-range positions) and
 * leaves the current selection untouched, matching the previous no-op fallback.
 */
export function setEditorTextSelection(editor: EditorLike, from: number, to: number): boolean {
    const view = getEditorProseMirrorView<ProseMirrorViewLike>(editor);
    if (!view) return false;
    try {
        const SelectionClass = view.state.selection.constructor as {
            create(doc: unknown, from: number, to: number): unknown;
        };
        view.dispatch(view.state.tr.setSelection(SelectionClass.create(view.state.doc, from, to)));
        return true;
    } catch {
        return false;
    }
}
