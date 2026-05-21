import { useEffect, useState } from 'react';
import { getBlockInfo, getNearestBlockPos } from '@blocknote/core';
import { getEditorDomElement, getEditorProseMirrorView } from '../utils/editorView';

interface InsertHandleState {
    blockId: string;
    placement: 'before' | 'after';
    top: number;
    left: number;
    width: number;
}

interface InsertHandleProps {
    editor: Record<string, unknown> | null;
    wrapperRef: React.RefObject<HTMLElement | null>;
    canvasRef: React.RefObject<HTMLElement | null>;
}

/**
 * Hook that manages the insert handle (+ button) between blocks.
 * Shows a + button when the mouse is near the top/bottom edge of a block,
 * allowing users to insert new blocks at that position.
 */
export function useInsertHandle({ editor, wrapperRef, canvasRef }: InsertHandleProps) {
    const [insertHandle, setInsertHandle] = useState<InsertHandleState | null>(null);

    useEffect(() => {
        const prosemirrorView = getEditorProseMirrorView<{ dom?: HTMLElement }>(editor);
        if (!prosemirrorView || !wrapperRef.current) return;
        const root = prosemirrorView.dom || getEditorDomElement(editor);
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;

        let hideTimeout: ReturnType<typeof setTimeout> | null = null;

        const updateHandle = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const isOverButton = !!target.closest('.block-insert-button');

            if (
                target.closest('.block-editor-structure-panel') ||
                target.closest('.bn-side-menu') ||
                target.closest('.bn-formatting-toolbar') ||
                target.closest('.bn-form-popover')
            ) {
                if (hideTimeout) clearTimeout(hideTimeout);
                setInsertHandle(null);
                return;
            }

            const isInsideEditor = (root instanceof HTMLElement && root.contains(target)) || wrapper.contains(target);
            if (!isInsideEditor && !isOverButton) {
                if (!hideTimeout) {
                    hideTimeout = setTimeout(() => {
                        setInsertHandle(null);
                        hideTimeout = null;
                    }, 400);
                }
                return;
            }

            const blockOuter = target.closest('[data-id]');
            let blockId = blockOuter?.getAttribute('data-id') || null;

            if (blockId) {
                const block = (editor as Record<string, (id: string) => unknown | null>).getBlock?.(blockId);
                if (block && ['bulletListItem', 'numberedListItem', 'checkListItem'].includes((block as Record<string, string>).type)) {
                    setInsertHandle(null);
                    return;
                }
            }

            let rect = blockOuter instanceof HTMLElement ? blockOuter.getBoundingClientRect() : null;
            const edgeThreshold = 25;

            if (!blockId || !rect) {
                const view = getEditorProseMirrorView<{
                    state: { doc: Parameters<typeof getNearestBlockPos>[0] };
                    nodeDOM: (pos: number) => unknown;
                    domAtPos: (pos: number) => { node: unknown };
                    posAtCoords?: (coords: { left: number; top: number }) => { pos: number } | null;
                }>(editor);
                const coords = view?.posAtCoords?.({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (!coords || !view) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => { setInsertHandle(null); hideTimeout = null; }, 400);
                    }
                    return;
                }
                const nearest = getNearestBlockPos(view.state.doc, coords.pos);
                if (!nearest) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => { setInsertHandle(null); hideTimeout = null; }, 400);
                    }
                    return;
                }
                const info = getBlockInfo(nearest) as { bnBlock: { beforePos: number; node?: { attrs?: Record<string, string> } } } | undefined;
                blockId = (info?.bnBlock?.node?.attrs as Record<string, string> | undefined)?.id || null;

                if (blockId) {
                    const block = (editor as Record<string, (id: string) => unknown | null>).getBlock?.(blockId);
                    if (block && ['bulletListItem', 'numberedListItem', 'checkListItem'].includes((block as Record<string, string>).type)) {
                        setInsertHandle(null);
                        return;
                    }
                }

                if (!blockId || !info) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => { setInsertHandle(null); hideTimeout = null; }, 400);
                    }
                    return;
                }
                let dom = (view.nodeDOM(info.bnBlock.beforePos + 1) || view.nodeDOM(info.bnBlock.beforePos)) as HTMLElement | null | undefined;
                if (!(dom instanceof HTMLElement)) {
                    const domAtPos = view.domAtPos(coords.pos).node;
                    dom = domAtPos instanceof HTMLElement ? domAtPos.closest('.bn-block-content') : null;
                }
                if (!(dom instanceof HTMLElement)) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => { setInsertHandle(null); hideTimeout = null; }, 400);
                    }
                    return;
                }
                rect = dom.getBoundingClientRect();
            }

            const distanceTop = Math.abs(event.clientY - rect.top);
            const distanceBottom = Math.abs(rect.bottom - event.clientY);
            const isNearEdge = distanceTop <= edgeThreshold || distanceBottom <= edgeThreshold;

            if (!isNearEdge && !isOverButton) {
                if (!hideTimeout) {
                    hideTimeout = setTimeout(() => { setInsertHandle(null); hideTimeout = null; }, 400);
                }
                return;
            }

            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            if (isOverButton) return;

            const containerRect = (canvas || wrapper).getBoundingClientRect();
            const placement: 'before' | 'after' = distanceTop <= distanceBottom ? 'before' : 'after';
            const handleBlockId = blockId;
            const handleRect = rect;

            const allBlocks = (editor as Record<string, unknown[]>).document;
            const flatIds = allBlocks.map((b) => (b as Record<string, string>).id);
            const currentIndex = flatIds.indexOf(handleBlockId);

            let topPosition = (placement === 'before' ? handleRect.top : handleRect.bottom);

            if (placement === 'after' && currentIndex < flatIds.length - 1) {
                const nextId = flatIds[currentIndex + 1];
                const nextEl = root instanceof HTMLElement
                    ? root.querySelector(`[data-id="${CSS.escape(nextId)}"]`)
                    : null;
                if (nextEl instanceof HTMLElement) {
                    const nextRect = nextEl.getBoundingClientRect();
                    topPosition = (handleRect.bottom + nextRect.top) / 2;
                }
            } else if (placement === 'before' && currentIndex > 0) {
                const prevId = flatIds[currentIndex - 1];
                const prevEl = root instanceof HTMLElement
                    ? root.querySelector(`[data-id="${CSS.escape(prevId)}"]`)
                    : null;
                if (prevEl instanceof HTMLElement) {
                    const prevRect = prevEl.getBoundingClientRect();
                    topPosition = (prevRect.bottom + handleRect.top) / 2;
                }
            }

            const top = topPosition - containerRect.top;
            const left = handleRect.left - containerRect.left;
            const width = handleRect.width;
            setInsertHandle({
                blockId: handleBlockId,
                placement,
                top,
                left,
                width,
            });
        };

        const clearHandle = () => {
            setInsertHandle(null);
        };

        wrapper.addEventListener('mousemove', updateHandle);
        wrapper.addEventListener('pointermove', updateHandle);
        wrapper.addEventListener('mouseleave', clearHandle);
        wrapper.addEventListener('pointerleave', clearHandle);
        wrapper.addEventListener('scroll', clearHandle);

        return () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            wrapper.removeEventListener('mousemove', updateHandle);
            wrapper.removeEventListener('pointermove', updateHandle);
            wrapper.removeEventListener('mouseleave', clearHandle);
            wrapper.removeEventListener('pointerleave', clearHandle);
            wrapper.removeEventListener('scroll', clearHandle);
        };
    }, [editor]);

    return { insertHandle, setInsertHandle };
}
