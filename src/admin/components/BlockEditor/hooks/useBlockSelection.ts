import { useEffect, useRef } from 'react';
import { CUSTOM_BLOCK_TYPES } from '../utils/constants';
import { getEditorDomElement } from '../utils/editorView';
import type { AppEditor } from '../schema';

interface BlockSelectionProps {
    editor: AppEditor | null;
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
    const isHandlingPointerRef = useRef(false);
    const lastPointerBlockIdRef = useRef<string | null>(null);

    useEffect(() => { onSelectedBlockChangeRef.current = onSelectedBlockChange; }, [onSelectedBlockChange]);
    useEffect(() => { onForceSelectHandledRef.current = onForceSelectHandled; }, [onForceSelectHandled]);
    useEffect(() => { activeBlockIdRef.current = activeBlockId; }, [activeBlockId]);

    // Look up a block by id and return it in the loose shape the selection
    // callbacks consume. Centralizes the single editor → Record bridge so the
    // editor itself stays strongly typed as AppEditor.
    const getBlockLoose = (id: string): Record<string, unknown> | null => {
        const block = editor?.getBlock(id);
        return block ? (block as unknown as Record<string, unknown>) : null;
    };

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
            if (isHandlingPointerRef.current) return;
            // Priority 1: Move action (up/down buttons)
            if (moveActionBlockIdRef.current) {
                const moveId = moveActionBlockIdRef.current;
                moveActionBlockIdRef.current = null;
                const moveBlock = getBlockLoose(moveId);
                if (moveBlock) {
                    setActiveBlockId(moveId);
                    onSelectedBlockChangeRef.current?.(moveBlock);
                    if (!CUSTOM_BLOCK_TYPES.has(moveBlock.type as string)) {
                        // Cursor position intentionally NOT forced to 'start' after move
                        // to prevent cursor jumps. Block remains selected via activeBlockId.
                    }
                    return;
                }
            }

            // Priority 2: Toolbar action
            if (toolbarActionBlockIdRef.current) {
                const toolbarId = toolbarActionBlockIdRef.current;
                const toolbarBlock = getBlockLoose(toolbarId);
                if (toolbarBlock) {
                    setActiveBlockId(toolbarId);
                    onSelectedBlockChangeRef.current?.(toolbarBlock);
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
                            const block = getBlockLoose(customBlockId);
                            if (block) {
                                onSelectedBlockChangeRef.current?.(block);
                            }
                        }
                        return;
                    }
                }
            }

            // Priority 5: Pointer-down manual selection
            const manualId = lastPointerBlockIdRef.current;
            if (manualId) {
                const manualBlock = getBlockLoose(manualId);
                setActiveBlockId(manualId);
                onSelectedBlockChangeRef.current?.(manualBlock);
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
                const cursorBlock = editor.getTextCursorPosition()?.block;
                block = cursorBlock ? (cursorBlock as unknown as Record<string, unknown>) : null;
                if (block && CUSTOM_BLOCK_TYPES.has(block.type as string)) {
                    block = null;
                }
            } catch {
                const domId = getBlockIdFromDom();
                if (domId) {
                    const domBlock = getBlockLoose(domId);
                    setActiveBlockId(domId);
                    onSelectedBlockChangeRef.current?.(domBlock);
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
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }, [editor, forceSelectBlockId]);

    // PointerDown and FocusIn handlers for custom blocks, move buttons, toolbar
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return undefined;

        const restoreTableInputFocus = (target: HTMLInputElement) => {
            window.setTimeout(() => {
                if (!target.isConnected) return;
                target.focus();
                const cursor = target.value.length;
                target.setSelectionRange(cursor, cursor);
            }, 0);
        };

        const handleTableControlPointer = (event: PointerEvent | MouseEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.closest('[data-simple-table-control="true"]')) return;
            if (target instanceof HTMLInputElement) {
                restoreTableInputFocus(target);
            }
        };

        const handlePointerDown = (event: PointerEvent) => {
            isHandlingPointerRef.current = true;
            try {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const currentActiveId = activeBlockIdRef.current;

                const tableControl = target.closest('[data-simple-table-control="true"]');
                if (tableControl) {
                    const blockRoot = target.closest('.wp-block--custom');
                    const blockId = blockRoot?.getAttribute('data-block');
                    if (blockId) {
                        lastPointerBlockIdRef.current = blockId;
                        if (blockId !== currentActiveId) {
                            const block = getBlockLoose(blockId);
                            setActiveBlockId(blockId);
                            if (block) onSelectedBlockChangeRef.current?.(block);
                        }
                    }

                    if (target instanceof HTMLInputElement) {
                        window.requestAnimationFrame(() => {
                            if (!target.isConnected) return;
                            if (document.activeElement !== target) {
                                target.focus();
                                const cursor = target.value.length;
                                target.setSelectionRange(cursor, cursor);
                            }
                        });
                    }
                    return;
                }

                const moveButton = target.closest('button[aria-label="Move up"], button[aria-label="Move down"]');
                if (moveButton) {
                    const blockRoot = moveButton.closest('[data-block]');
                    const blockId = blockRoot?.getAttribute('data-block');
                    if (blockId) moveActionBlockIdRef.current = blockId;
                    return;
                }

                if (target.closest('.wp-block-toolbar-wrap') || target.closest('.wp-block-toolbar')) {
                    if (currentActiveId) toolbarActionBlockIdRef.current = currentActiveId;
                    return;
                }

                const customBlock = target.closest('.wp-block--custom');
                if (customBlock) {
                    const blockId = customBlock.getAttribute('data-block');
                    if (blockId) {
                        lastPointerBlockIdRef.current = blockId;
                        if (blockId !== currentActiveId) {
                            const block = getBlockLoose(blockId);
                            setActiveBlockId(blockId);
                            if (block) onSelectedBlockChangeRef.current?.(block);
                        }
                        return;
                    }
                }
                lastPointerBlockIdRef.current = null;
            } finally {
                isHandlingPointerRef.current = false;
            }
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

        wrapper.addEventListener('pointerdown', handleTableControlPointer, true);
        wrapper.addEventListener('mousedown', handleTableControlPointer, true);
        wrapper.addEventListener('pointerdown', handlePointerDown, true);
        wrapper.addEventListener('focusin', handleFocusIn, true);
        return () => {
            wrapper.removeEventListener('pointerdown', handleTableControlPointer, true);
            wrapper.removeEventListener('mousedown', handleTableControlPointer, true);
            wrapper.removeEventListener('pointerdown', handlePointerDown, true);
            wrapper.removeEventListener('focusin', handleFocusIn, true);
        };
    }, [editor]);

    // Force select from parent (e.g. List View click)
    useEffect(() => {
        if (!forceSelectBlockId || !editor) return;
        if (forceSelectBlockId === activeBlockId) return;
        const block = getBlockLoose(forceSelectBlockId);
        if (block) {
            setActiveBlockId(forceSelectBlockId);
            onSelectedBlockChangeRef.current?.(block);
            if (!CUSTOM_BLOCK_TYPES.has(block.type as string)) {
                try {
                    const currentPos = editor.getTextCursorPosition();
                    if (currentPos?.block?.id !== forceSelectBlockId) {
                        editor.setTextCursorPosition(forceSelectBlockId, 'start');
                    }
                } catch {}
            }
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

    // Allow native text selection inside custom-block form controls.
    // content:'none' blocks are ProseMirror atoms: once node-selected, dragging
    // anywhere in them starts a node drag, so drag-to-select inside an <input>
    // moves the block instead of selecting text. Suppress the native drag when
    // the gesture begins on a form control inside a custom block; the side-menu
    // drag handle and normal block dragging are unaffected.
    useEffect(() => {
        const editorDom = getEditorDomElement(editor);
        if (!editorDom) return;
        let suppressDrag = false;
        const isCustomBlockField = (node: EventTarget | null): boolean =>
            node instanceof HTMLElement
            && !!node.closest('.wp-block--custom')
            && !!node.closest('input, textarea, select, [contenteditable="true"]');
        const onPointerDown = (event: Event) => {
            suppressDrag = isCustomBlockField(event.target);
        };
        const onDragStart = (event: DragEvent) => {
            if (suppressDrag || isCustomBlockField(event.target)) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        editorDom.addEventListener('pointerdown', onPointerDown, true);
        editorDom.addEventListener('dragstart', onDragStart, true);
        return () => {
            editorDom.removeEventListener('pointerdown', onPointerDown, true);
            editorDom.removeEventListener('dragstart', onDragStart, true);
        };
    }, [editor]);

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
