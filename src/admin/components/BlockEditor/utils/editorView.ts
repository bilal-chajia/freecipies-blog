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
