import { useCallback } from 'react';
import { useDraggable, type UseDraggableArguments } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/**
 * Move a block up or down by ID, without relying on text cursor position.
 * This is critical for custom blocks (content: 'none') where
 * setTextCursorPosition() fails silently.
 */
function moveBlockById(editor: object | null, blockId: string, direction: 'up' | 'down'): boolean {
    if (!editor || !blockId) return false;
    const block = (editor as Record<string, (id: string) => unknown | null>).getBlock?.(blockId);
    if (!block) return false;

    if (direction === 'up') {
        const prev = (editor as Record<string, (id: string) => unknown | null>).getPrevBlock?.(blockId);
        if (!prev) return false;
        // Remove the block then re-insert it before the previous block
        (editor as Record<string, (ids: string[]) => void>).removeBlocks?.([blockId]);
        (editor as Record<string, (blocks: unknown[], refId: string, pos: string) => void>).insertBlocks?.([block], (prev as Record<string, string>).id, 'before');
    } else {
        const next = (editor as Record<string, (id: string) => unknown | null>).getNextBlock?.(blockId);
        if (!next) return false;
        // Remove the block then re-insert it after the next block
        (editor as Record<string, (ids: string[]) => void>).removeBlocks?.([blockId]);
        (editor as Record<string, (blocks: unknown[], refId: string, pos: string) => void>).insertBlocks?.([block], (next as Record<string, string>).id, 'after');
    }
    return true;
}

interface BlockActionPrimitivesProps {
    editor: object | null;
    blockId: string;
    onSelect?: () => void;
}

export function useBlockActionPrimitives({ editor, blockId, onSelect }: BlockActionPrimitivesProps) {
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
        (editor as Record<string, (ids: string[]) => void>).removeBlocks?.([blockId]);
    }, [blockId, editor]);

    return {
        moveUp,
        moveDown,
        remove,
    };
}

interface BlockDragHandleOptions {
    disabled?: boolean;
}

export function useBlockDragHandle(blockId: string, { disabled = false }: BlockDragHandleOptions = {}) {
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
