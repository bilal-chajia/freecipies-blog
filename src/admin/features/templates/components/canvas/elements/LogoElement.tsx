import React, { memo, useCallback } from 'react';
import { Group, Rect, Image as KonvaImage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { EditorElement } from '@admin/features/templates/store';

interface LogoElementProps {
  element: EditorElement;
  image: CanvasImageSource | null;
  editable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onTransformEnd?: (e: KonvaEventObject<Event>) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

const LogoElement = memo(function LogoElement({
  element,
  image,
  editable,
  onSelect,
  onTransformEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
}: LogoElementProps) {
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
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      opacity={element.opacity || 1}
      draggable={!isLocked && editable}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={onTransformEnd ? () => {} : undefined}
      onTransformEnd={onTransformEnd}
      onClick={handleClick}
      onTap={handleTap}
    >
      {image ? (
        <KonvaImage image={image} width={element.width} height={element.height} />
      ) : (
        <Rect
          width={element.width || 120}
          height={element.height || 40}
          fill="#2a2a3e"
          stroke="#4a4a5e"
          strokeWidth={1}
          cornerRadius={4}
        />
      )}
    </Group>
  );
});

export default LogoElement;
