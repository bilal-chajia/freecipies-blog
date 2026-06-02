import { useCallback, useEffect, useRef } from 'react';
import { useSensors, useSensor, PointerSensor, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { moveBlockById } from '../blocks/primitives';
import { getEditorDomElement } from '../utils/editorView';
import type { AppEditor } from '../schema';

interface StructureItem {
    id: string;
    parentId: string | null;
}

interface CanvasDragDropProps {
    editor: AppEditor | null;
    structureItemsRef: React.MutableRefObject<StructureItem[]>;
    setActiveBlockId: (id: string | null) => void;
}

/**
 * Hook that manages canvas-level drag-and-drop for block reordering.
 * Handles pointer tracking, drop target detection, and block move execution.
 */
export function useCanvasDragDrop({ editor, structureItemsRef, setActiveBlockId }: CanvasDragDropProps) {
    const canvasDragPointerRef = useRef({ x: 0, y: 0 });
    const canvasDragPointerListenerRef = useRef<EventListener | null>(null);
    const moveActionBlockIdRef = useRef<string | null>(null);

    const canvasSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

    const updateCanvasDragPointer = useCallback((event: PointerEvent | MouseEvent | TouchEvent) => {
        if (!event) return;
        if ('clientX' in event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
            canvasDragPointerRef.current = { x: event.clientX, y: event.clientY };
            return;
        }
        const touches = (event as TouchEvent).touches || (event as TouchEvent).changedTouches;
        if (touches && touches[0]) {
            canvasDragPointerRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        }
    }, []);

    const startCanvasDragPointerTracking = useCallback((initialEvent: PointerEvent | MouseEvent | TouchEvent) => {
        if (canvasDragPointerListenerRef.current) return;
        updateCanvasDragPointer(initialEvent);
        const handler: EventListener = (event) => updateCanvasDragPointer(event as PointerEvent | MouseEvent | TouchEvent);
        window.addEventListener('pointermove', handler, { capture: true });
        window.addEventListener('mousemove', handler, { capture: true });
        window.addEventListener('touchmove', handler, { capture: true, passive: true });
        canvasDragPointerListenerRef.current = handler;
    }, [updateCanvasDragPointer]);

    const stopCanvasDragPointerTracking = useCallback(() => {
        const handler = canvasDragPointerListenerRef.current;
        if (!handler) return;
        window.removeEventListener('pointermove', handler, { capture: true });
        window.removeEventListener('mousemove', handler, { capture: true });
        window.removeEventListener('touchmove', handler, { capture: true });
        canvasDragPointerListenerRef.current = null;
    }, []);

    useEffect(() => stopCanvasDragPointerTracking, [stopCanvasDragPointerTracking]);

    const reorderBlockRelativeToTarget = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
        if (!editor || !draggedId || !targetId) return;
        if (draggedId === targetId) return;
        const items = structureItemsRef.current || [];
        const dragged = items.find((item) => item.id === draggedId);
        const target = items.find((item) => item.id === targetId);
        if (!dragged || !target) return;
        if (dragged.parentId !== target.parentId) return;

        const siblings = items
            .filter((item) => item.parentId === dragged.parentId)
            .map((item) => item.id);
        const fromIndex = siblings.indexOf(draggedId);
        const targetIndex = siblings.indexOf(targetId);
        if (fromIndex < 0 || targetIndex < 0) return;

        let desiredIndex = targetIndex + (position === 'after' ? 1 : 0);
        if (fromIndex < targetIndex) desiredIndex -= 1;
        desiredIndex = Math.max(0, Math.min(siblings.length - 1, desiredIndex));

        const steps = desiredIndex - fromIndex;
        const direction = steps < 0 ? 'up' : 'down';
        const absSteps = Math.abs(steps);
        for (let i = 0; i < absSteps; i++) {
            moveBlockById(editor, draggedId, direction);
        }
        moveActionBlockIdRef.current = draggedId;
        setActiveBlockId(draggedId);
        editor.focus();
    }, [editor, structureItemsRef, setActiveBlockId]);

    const getBlockFromPoint = useCallback((x: number, y: number): { id: string; element: HTMLElement } | null => {
        const root = getEditorDomElement(editor);
        if (!root) return null;
        const element = document.elementFromPoint(x, y);
        if (!(element instanceof HTMLElement)) return null;
        const candidate = element.closest('[data-id]');
        if (!(candidate instanceof HTMLElement)) return null;
        if (!root.contains(candidate)) return null;
        const id = candidate.getAttribute('data-id');
        if (!id) return null;
        return { id, element: candidate };
    }, [editor]);

    const handleCanvasDragStart = useCallback((event: DragStartEvent) => {
        startCanvasDragPointerTracking(event?.activatorEvent as PointerEvent | MouseEvent | TouchEvent);
        const draggedId = event?.active?.id ? String(event.active.id) : null;
        if (draggedId) {
            setActiveBlockId(draggedId);
            moveActionBlockIdRef.current = draggedId;
        }
    }, [startCanvasDragPointerTracking, setActiveBlockId]);

    const handleCanvasDragCancel = useCallback(() => {
        stopCanvasDragPointerTracking();
    }, [stopCanvasDragPointerTracking]);

    const handleCanvasDragEnd = useCallback((event: DragEndEvent) => {
        stopCanvasDragPointerTracking();
        const draggedId = event?.active?.id ? String(event.active.id) : null;
        if (!draggedId) return;
        const { x, y } = canvasDragPointerRef.current || {};
        if (typeof x !== 'number' || typeof y !== 'number') return;
        const target = getBlockFromPoint(x, y);
        const targetId = target?.id || null;
        if (!targetId || targetId === draggedId) return;
        const rect = target?.element?.getBoundingClientRect?.();
        const position: 'before' | 'after' = rect && rect.height ? (y < rect.top + rect.height / 2 ? 'before' : 'after') : 'after';
        reorderBlockRelativeToTarget(draggedId, targetId, position);
    }, [getBlockFromPoint, reorderBlockRelativeToTarget, stopCanvasDragPointerTracking]);

    return {
        canvasSensors,
        handleCanvasDragStart,
        handleCanvasDragEnd,
        handleCanvasDragCancel,
        moveActionBlockIdRef,
    };
}
