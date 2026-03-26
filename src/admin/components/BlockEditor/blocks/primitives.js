import { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export function useBlockActionPrimitives({ editor, blockId, onSelect }) {
    const focusBlock = useCallback(() => {
        if (!editor || !blockId) return;
        try {
            editor.setTextCursorPosition(blockId, 'start');
        } catch {
            // Cursor may fail during drag transitions or after deletion.
        }
        editor.focus?.();
        onSelect?.();
    }, [blockId, editor, onSelect]);

    const moveUp = useCallback(() => {
        if (!editor || !blockId) return;
        focusBlock();
        editor.moveBlocksUp?.();
        requestAnimationFrame(() => {
            focusBlock();
        });
    }, [blockId, editor, focusBlock]);

    const moveDown = useCallback(() => {
        if (!editor || !blockId) return;
        focusBlock();
        editor.moveBlocksDown?.();
        requestAnimationFrame(() => {
            focusBlock();
        });
    }, [blockId, editor, focusBlock]);

    const remove = useCallback(() => {
        if (!editor || !blockId) return;
        editor.removeBlocks?.([blockId]);
    }, [blockId, editor]);

    return {
        focusBlock,
        moveUp,
        moveDown,
        remove,
    };
}

export function useBlockDragHandle(blockId, { disabled = false } = {}) {
    const {
        attributes: dragAttributes,
        listeners: dragListeners,
        setNodeRef: setDragNodeRef,
        transform: dragTransform,
        isDragging,
    } = useDraggable({ id: blockId, disabled });

    return {
        dragHandleProps: { ...dragAttributes, ...dragListeners },
        setDragNodeRef,
        dragStyle: dragTransform ? { transform: CSS.Transform.toString(dragTransform) } : undefined,
        isDragging,
    };
}
