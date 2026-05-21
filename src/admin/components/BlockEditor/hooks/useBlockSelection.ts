import { useEffect, useRef } from 'react';
import { CUSTOM_BLOCK_TYPES } from '../utils/constants';
import { getEditorDomElement } from '../utils/editorView';

interface BlockSelectionProps {
    editor: Record<string, unknown> | null;
    wrapperRef: React.RefObject<HTMLElement | null>;
    activeBlockId: string | null;
    setActiveBlockId: (id: string | null) => void;
    onSelectedBlockChange?: (block: Record<string, unknown> | null) => void;
    forceSelectBlockId?: string | null;
    onForceSelectHandled?: () => void;
    moveActionBlockIdRef: React.MutableRefObject<string | null>;
}

/**
 * Hook that manages active block selection tracking.
 * Handles: cursor-based selection, custom block clicks,
 * toolbar/move action preservation, force-select from parent,
 * and data-selected DOM attribute sync.
 */
export function useBlockSelection({
    editor,
    wrapperRef,
    activeBlockId,
    setActiveBlockId,
    onSelectedBlockChange,
    forceSelectBlockId,
    onForceSelectHandled,
    moveActionBlockIdRef,
}: BlockSelectionProps) {
    const onSelectedBlockChangeRef = useRef(onSelectedBlockChange);
    const onForceSelectHandledRef = useRef(onForceSelectHandled);
    const activeBlockIdRef = useRef(activeBlockId);
    const toolbarActionBlockIdRef = useRef<string | null>(null);
    const lastPointerBlockIdRef = useRef<string | null>(null);

    useEffect(() => { onSelectedBlockChangeRef.current = onSelectedBlockChange; }, [onSelectedBlockChange]);
    useEffect(() => { onForceSelectHandledRef.current = onForceSelectHandled; }, [onForceSelectHandled]);
    useEffect(() => { activeBlockIdRef.current = activeBlockId; }, [activeBlockId]);

    // Main selection change handler
    useEffect(() => {
        if (!editor) return undefined;

        const getBlockIdFromDom = (): string | null => {
            const selection = window.getSelection();
            if (!selection || !selection.anchorNode) return null;
            const anchorNode = selection.anchorNode.nodeType === Node.ELEMENT_NODE
                ? selection.anchorNode
                : selection.anchorNode.parentElement;
            if (!(anchorNode instanceof HTMLElement)) return null;
            const wrapper = anchorNode.closest('[data-block]');
            return wrapper?.getAttribute('data-block') || null;
        };

        const handleSelection = () => {
            // Priority 1: Move action (up/down buttons)
            if (moveActionBlockIdRef.current) {
                const moveId = moveActionBlockIdRef.current;
                moveActionBlockIdRef.current = null;
                const moveBlock = (editor as Record<string, (id: string) => unknown>).getBlock?.(moveId) || null;
                if (moveBlock) {
                    setActiveBlockId(moveId);
                    onSelectedBlockChangeRef.current?.(moveBlock as Record<string, unknown>);
                    if (!CUSTOM_BLOCK_TYPES.has((moveBlock as Record<string, string>).type)) {
                        requestAnimationFrame(() => {
                            try { (editor as Record<string, (id: string, pos: string) => void>).setTextCursorPosition?.(moveId, 'start'); } catch {}
                        });
                    }
                    return;
                }
            }

            // Priority 2: Toolbar action
            if (toolbarActionBlockIdRef.current) {
                const toolbarId = toolbarActionBlockIdRef.current;
                const toolbarBlock = (editor as Record<string, (id: string) => unknown>).getBlock?.(toolbarId) || null;
                if (toolbarBlock) {
                    setActiveBlockId(toolbarId);
                    onSelectedBlockChangeRef.current?.(toolbarBlock as Record<string, unknown>);
                    toolbarActionBlockIdRef.current = null;
                    return;
                }
                toolbarActionBlockIdRef.current = null;
            }

            // Priority 3: Active Block Focus/Click Lock
            const currentActiveId = activeBlockIdRef.current;
            const activeElement = document.activeElement;
            const editorWrapper = wrapperRef.current;

            if (currentActiveId && editorWrapper) {
                const activeBlockDom = editorWrapper.querySelector(`[data-block="${currentActiveId}"]`);
                
                // If focus is inside the currently selected custom block's DOM subtree, strictly lock selection!
                if (activeBlockDom && activeElement instanceof HTMLElement) {
                    if (activeBlockDom === activeElement || activeBlockDom.contains(activeElement)) {
                        return; // Lock and preserve selection
                    }
                }
                
                // If the pointer just clicked inside the active custom block, preserve the selection
                if (lastPointerBlockIdRef.current === currentActiveId) {
                    return; // Lock and preserve selection
                }
            }

            // Priority 4: Focus inside custom block form controls (when focusing/clicking a block not yet active)
            if (activeElement instanceof HTMLElement && editorWrapper) {
                const customBlock = activeElement.closest('.wp-block--custom');
                if (customBlock) {
                    const customBlockId = customBlock.getAttribute('data-block');
                    if (customBlockId) {
                        if (currentActiveId !== customBlockId) {
                            setActiveBlockId(customBlockId);
                            const block = (editor as Record<string, (id: string) => unknown>).getBlock?.(customBlockId) || null;
                            if (block) {
                                onSelectedBlockChangeRef.current?.(block as Record<string, unknown>);
                            }
                        }
                        return;
                    }
                }
            }

            // Priority 5: Pointer-down manual selection
            const manualId = lastPointerBlockIdRef.current;
            if (manualId) {
                const manualBlock = (editor as Record<string, (id: string) => unknown>).getBlock?.(manualId) || null;
                setActiveBlockId(manualId);
                onSelectedBlockChangeRef.current?.(manualBlock as Record<string, unknown> | null);
                lastPointerBlockIdRef.current = null;
                return;
            }

            // Priority 6: Focus completely outside the editor (e.g. sidebar, page title input)
            // Preserve the active block instead of falling back to natural cursor
            if (activeElement instanceof HTMLElement && editorWrapper && !editorWrapper.contains(activeElement)) {
                return;
            }

            // Priority 7: Natural cursor position
            let block: Record<string, unknown> | null = null;
            try { 
                block = (editor as Record<string, () => { block: Record<string, unknown> }>).getTextCursorPosition?.().block; 
            } catch {
                const domId = getBlockIdFromDom();
                if (domId) {
                    const domBlock = (editor as Record<string, (id: string) => unknown>).getBlock?.(domId) || null;
                    setActiveBlockId(domId);
                    onSelectedBlockChangeRef.current?.(domBlock as Record<string, unknown> | null);
                    lastPointerBlockIdRef.current = null;
                    return;
                }
            }

            const nextBlockId = block?.id as string | undefined || null;
            if (nextBlockId !== currentActiveId) {
                if (forceSelectBlockId && nextBlockId && nextBlockId !== forceSelectBlockId) return;
                setActiveBlockId(nextBlockId);
                onSelectedBlockChangeRef.current?.(block || null);
            }
            lastPointerBlockIdRef.current = null;
        };

        handleSelection();
        const unsubscribe = (editor as Record<string, (cb: () => void) => (() => void) | void>).onSelectionChange?.(handleSelection);
        return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }, [editor, activeBlockId, forceSelectBlockId]);

    // PointerDown and FocusIn handlers for custom blocks, move buttons, toolbar
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return undefined;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const moveButton = target.closest('button[aria-label="Move up"], button[aria-label="Move down"]');
            if (moveButton) {
                const blockRoot = moveButton.closest('[data-block]');
                const blockId = blockRoot?.getAttribute('data-block');
                if (blockId) moveActionBlockIdRef.current = blockId;
                return;
            }

            if (target.closest('.wp-block-toolbar-wrap') || target.closest('.wp-block-toolbar')) {
                if (activeBlockId) toolbarActionBlockIdRef.current = activeBlockId;
                return;
            }

            const customBlock = target.closest('.wp-block--custom');
            if (customBlock) {
                const blockId = customBlock.getAttribute('data-block');
                if (blockId) {
                    lastPointerBlockIdRef.current = blockId;
                    if (blockId !== activeBlockId) {
                        const block = (editor as Record<string, (id: string) => unknown> | null)?.getBlock?.(blockId);
                        setActiveBlockId(blockId);
                        if (block) onSelectedBlockChangeRef.current?.(block as Record<string, unknown>);
                    }
                    return;
                }
            }
            lastPointerBlockIdRef.current = null;
        };

        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const customBlock = target.closest('.wp-block--custom');
            if (customBlock) {
                const blockId = customBlock.getAttribute('data-block');
                if (blockId) {
                    if (blockId !== activeBlockIdRef.current) {
                        setActiveBlockId(blockId);
                        const block = (editor as Record<string, (id: string) => unknown> | null)?.getBlock?.(blockId);
                        if (block) onSelectedBlockChangeRef.current?.(block as Record<string, unknown>);
                    }
                }
            }
        };

        wrapper.addEventListener('pointerdown', handlePointerDown, true);
        wrapper.addEventListener('focusin', handleFocusIn, true);
        return () => {
            wrapper.removeEventListener('pointerdown', handlePointerDown, true);
            wrapper.removeEventListener('focusin', handleFocusIn, true);
        };
    }, [activeBlockId, editor]);

    // Force select from parent (e.g. List View click)
    useEffect(() => {
        if (!forceSelectBlockId || !editor) return;
        if (forceSelectBlockId === activeBlockId) return;
        const block = (editor as Record<string, (id: string) => unknown>).getBlock?.(forceSelectBlockId) || null;
        if (block) {
            setActiveBlockId(forceSelectBlockId);
            onSelectedBlockChangeRef.current?.(block as Record<string, unknown>);
            try {
                const currentPos = (editor as Record<string, () => { block?: { id: string } }>).getTextCursorPosition?.();
                if (currentPos?.block?.id !== forceSelectBlockId) {
                    (editor as Record<string, (id: string, pos: string) => void>).setTextCursorPosition?.(forceSelectBlockId, 'start');
                }
            } catch {}
            onForceSelectHandledRef.current?.();
        }
    }, [forceSelectBlockId, editor, activeBlockId]);

    // Data-selected attribute sync
    useEffect(() => {
        const root = getEditorDomElement(editor);
        if (!root) return;
        const prev = root.querySelector('[data-selected="true"]');
        if (prev) prev.removeAttribute('data-selected');
        if (activeBlockId) {
            const byRoot = root.querySelector(`[data-block-root="true"][data-id="${activeBlockId}"]`);
            const byId = root.querySelector(`[data-id="${activeBlockId}"]`);
            const bySelection = root.querySelector('.ProseMirror-selectednode')?.closest('[data-id]');
            const next = byRoot || byId || bySelection;
            if (next) {
                next.setAttribute('data-selected', 'true');
                if (!next.hasAttribute('data-block-root')) next.setAttribute('data-block-root', 'true');
            }
        }
    }, [editor, activeBlockId]);

    // Prevent link navigation inside editor
    useEffect(() => {
        const editorDom = getEditorDomElement(editor);
        if (!editorDom) return;
        const handle = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const link = target.closest('a');
            if (!link || !editorDom.contains(link)) return;
            event.preventDefault();
            event.stopPropagation();
        };
        document.addEventListener('click', handle, true);
        document.addEventListener('pointerdown', handle, true);
        return () => {
            document.removeEventListener('click', handle, true);
            document.removeEventListener('pointerdown', handle, true);
        };
    }, [editor]);

    return {
        toolbarActionBlockIdRef,
        lastPointerBlockIdRef,
    };
}
