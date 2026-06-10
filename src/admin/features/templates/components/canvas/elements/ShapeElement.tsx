import React, { memo, useCallback } from 'react';
import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ShapeElement as ShapeElementType } from '@admin/features/templates/store';

interface ShapeElementProps {
  element: ShapeElementType;
  editable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onTransformEnd?: (e: KonvaEventObject<Event>) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

const ShapeElement = memo(function ShapeElement({
  element,
  editable,
  onSelect,
  onTransformEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ShapeElementProps) {
  const isLocked = element.locked;

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      onSelect(element.id, e);
    },
    [element.id, onSelect]
  );

  const handleTap = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      onSelect(element.id, e);
    },
    [element.id, onSelect]
  );

  return (
    <Rect
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      fill={element.fill || '#6366f1'}
      opacity={element.opacity || 1}
      cornerRadius={element.border_radius || 0}
      rotation={element.rotation || 0}
      draggable={!isLocked && editable}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={onTransformEnd ? () => {} : undefined}
      onTransformEnd={onTransformEnd}
      onClick={handleClick}
      onTap={handleTap}
    />
  );
});

export default ShapeElement;
