import React, { memo, useCallback } from 'react';
import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { OverlayElement as OverlayElementType } from '@admin/features/templates/store';

interface OverlayElementProps {
  element: OverlayElementType;
  canvasWidth: number;
  canvasHeight: number;
  editable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

const OverlayElement = memo(function OverlayElement({
  element,
  canvasWidth,
  canvasHeight,
  editable,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: OverlayElementProps) {
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
      x={element.x || 0}
      y={element.y || 0}
      width={element.width || canvasWidth}
      height={element.height || canvasHeight}
      fill={element.fill || 'rgba(0,0,0,0.3)'}
      opacity={element.opacity || 1}
      draggable={!isLocked && editable}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      onTap={handleTap}
    />
  );
});

export default OverlayElement;
