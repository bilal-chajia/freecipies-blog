import { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/**
 * Move a block up or down by ID, without relying on text cursor position.
 * This is critical for custom blocks (content: 'none') where
 * setTextCursorPosition() fails silently.
 */
function moveBlockById(editor, blockId, direction) {
    if (!editor || !blockId) return false;
    const block = editor.getBlock(blockId);
    if (!block) return false;

    if (direction === 'up') {
        const prev = editor.getPrevBlock(blockId);
        if (!prev) return false;
        // Remove the block then re-insert it before the previous block
        editor.removeBlocks([blockId]);
        editor.insertBlocks([block], prev.id, 'before');
    } else {
        const next = editor.getNextBlock(blockId);
        if (!next) return false;
        // Remove the block then re-insert it after the next block
        editor.removeBlocks([blockId]);
        editor.insertBlocks([block], next.id, 'after');
    }
    return true;
}

export function useBlockActionPrimitives({ editor, blockId, onSelect }) {
    const moveUp = useCallback(() => {
        if (!editor || !blockId) return;
        moveBlockById(editor, blockId, 'up');
        onSelect?.();
    }, [blockId, editor, onSelect]);

    const moveDown = useCallback(() => {
        if (!editor || !blockId) return;
        moveBlockById(editor, blockId, 'down');
        onSelect?.();
    }, [blockId, editor, onSelect]);

    const remove = useCallback(() => {
        if (!editor || !blockId) return;
        editor.removeBlocks?.([blockId]);
    }, [blockId, editor]);

    return {
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

export { moveBlockById };
