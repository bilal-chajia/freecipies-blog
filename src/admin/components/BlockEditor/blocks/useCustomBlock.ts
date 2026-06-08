/**
 * useCustomBlock — shared preamble for custom block render functions.
 *
 * Every custom block repeats the same selection + move/remove + drag-handle
 * wiring. This hook bundles it so a block render only needs one call. Behavior
 * is identical to the inlined version; the two opt-in flags cover the only
 * variations across blocks:
 *   - onSelectRaf:  defer selectBlock() to the next frame after a move/remove
 *   - dragDisabled: disable the drag handle (e.g. while a modal/overlay is open)
 */
import { useBlockSelection } from '../selection-context';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';

interface UseCustomBlockOptions {
  /** Defer selectBlock() to requestAnimationFrame after move/remove. */
  onSelectRaf?: boolean;
  /** Disable dragging (e.g. while an overlay/dialog is open). */
  dragDisabled?: boolean;
}

export function useCustomBlock(
  blockId: string,
  editor: object | null,
  { onSelectRaf = false, dragDisabled = false }: UseCustomBlockOptions = {}
) {
  const { isSelected, selectBlock } = useBlockSelection(blockId);

  const onSelect = onSelectRaf
    ? () => requestAnimationFrame(() => selectBlock())
    : selectBlock;

  const { moveUp, moveDown, remove } = useBlockActionPrimitives({
    editor,
    blockId,
    onSelect,
  });

  const { dragHandleProps, setDragNodeRef, dragStyle, isDragging } =
    useBlockDragHandle(blockId, { disabled: dragDisabled });

  return {
    isSelected,
    selectBlock,
    moveUp,
    moveDown,
    remove,
    dragHandleProps,
    setDragNodeRef,
    dragStyle,
    isDragging,
  };
}
