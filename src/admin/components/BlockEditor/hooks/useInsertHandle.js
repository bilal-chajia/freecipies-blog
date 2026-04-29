import { useEffect, useState } from 'react';
import { getBlockInfo, getNearestBlockPos } from '@blocknote/core';

/**
 * Hook that manages the insert handle (+ button) between blocks.
 * Shows a + button when the mouse is near the top/bottom edge of a block,
 * allowing users to insert new blocks at that position.
 */
export function useInsertHandle({ editor, wrapperRef, canvasRef }) {
    const [insertHandle, setInsertHandle] = useState(null);

    useEffect(() => {
        if (!editor?.prosemirrorView || !wrapperRef.current) return;
        const root = editor.prosemirrorView?.dom || editor.domElement;
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;

        let hideTimeout = null;

        const updateHandle = (event) => {
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
                const block = editor.getBlock(blockId);
                if (block && ['bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
                    setInsertHandle(null);
                    return;
                }
            }

            let rect = blockOuter instanceof HTMLElement ? blockOuter.getBoundingClientRect() : null;
            const edgeThreshold = 25;

            if (!blockId || !rect) {
                const view = editor.prosemirrorView;
                const coords = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (!coords) {
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
                const info = getBlockInfo(nearest);
                blockId = info?.bnBlock?.node?.attrs?.id || null;

                if (blockId) {
                    const block = editor.getBlock(blockId);
                    if (block && ['bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
                        setInsertHandle(null);
                        return;
                    }
                }

                if (!blockId) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => { setInsertHandle(null); hideTimeout = null; }, 400);
                    }
                    return;
                }
                let dom = view.nodeDOM(info.bnBlock.beforePos + 1) || view.nodeDOM(info.bnBlock.beforePos);
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
            let placement = distanceTop <= distanceBottom ? 'before' : 'after';
            let handleBlockId = blockId;
            let handleRect = rect;

            const allBlocks = editor.document;
            const flatIds = allBlocks.map((b) => b.id);
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
