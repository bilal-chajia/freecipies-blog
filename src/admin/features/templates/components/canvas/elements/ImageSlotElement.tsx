import React, { memo, useCallback, useMemo } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ImageSlotElement as ImageSlotElementType } from '@admin/features/templates/store';

interface ImageSlotElementProps {
  element: ImageSlotElementType;
  image: CanvasImageSource | null;
  fallbackImage: CanvasImageSource | null;
  imageScale: number;
  imageOffset: { x: number; y: number };
  allowImageDrag: boolean;
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
  onImageOffsetChange?: (id: string, offset: { x: number; y: number }) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
}

const ImageSlotElement = memo(function ImageSlotElement({
  element,
  image,
  fallbackImage,
  imageScale,
  imageOffset,
  allowImageDrag,
  selectedId,
  editable,
  onSelect,
  onTransformEnd,
  onImageOffsetChange,
  onDragStart,
  onDragMove,
  onDragEnd,
}: ImageSlotElementProps) {
  const resolvedImage = image || fallbackImage;

  const coverMetrics = useMemo(() => {
    let baseOffsetX = 0;
    let baseOffsetY = 0;
    let scaledWidth = element.width;
    let scaledHeight = element.height;

    if (resolvedImage) {
      const imgWidth = (resolvedImage as HTMLImageElement).naturalWidth || (resolvedImage as any).width || element.width;
      const imgHeight = (resolvedImage as HTMLImageElement).naturalHeight || (resolvedImage as any).height || element.height;
      const slotRatio = element.width / element.height;
      const imgRatio = imgWidth / imgHeight;

      if (imgRatio > slotRatio) {
        const scale = element.height / imgHeight;
        scaledWidth = imgWidth * scale;
        scaledHeight = element.height;
        baseOffsetX = (element.width - scaledWidth) / 2;
      } else {
        const scale = element.width / imgWidth;
        scaledWidth = element.width;
        scaledHeight = imgHeight * scale;
        baseOffsetY = (element.height - scaledHeight) / 2;
      }
    }

    const zoomScale = imageScale || 1;
    const finalWidth = scaledWidth * zoomScale;
    const finalHeight = scaledHeight * zoomScale;
    const zoomOffsetX = (finalWidth - scaledWidth) / 2;
    const zoomOffsetY = (finalHeight - scaledHeight) / 2;
    const adjustedBaseOffsetX = baseOffsetX - zoomOffsetX;
    const adjustedBaseOffsetY = baseOffsetY - zoomOffsetY;
    const imageOffsetX = adjustedBaseOffsetX + (imageOffset?.x || 0);
    const imageOffsetY = adjustedBaseOffsetY + (imageOffset?.y || 0);

    return {
      finalWidth,
      finalHeight,
      imageOffsetX,
      imageOffsetY,
      adjustedBaseOffsetX,
      adjustedBaseOffsetY,
    };
  }, [resolvedImage, element.width, element.height, imageScale, imageOffset]);

  const { finalWidth, finalHeight, imageOffsetX, imageOffsetY, adjustedBaseOffsetX, adjustedBaseOffsetY } = coverMetrics;

  const isSelected = selectedId === element.id;
  const groupDraggable = allowImageDrag ? false : !element.locked && editable;

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

  const handleImageDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (allowImageDrag) {
        e.cancelBubble = true;
      }
    },
    [allowImageDrag]
  );

  const handleImageDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (allowImageDrag) {
        e.cancelBubble = true;
      }
    },
    [allowImageDrag]
  );

  const handleImageDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (allowImageDrag) {
        e.cancelBubble = true;
        if (onImageOffsetChange) {
          const newX = e.target.x() - adjustedBaseOffsetX;
          const newY = e.target.y() - adjustedBaseOffsetY;
          onImageOffsetChange(element.id, { x: newX, y: newY });
        }
      }
    },
    [allowImageDrag, adjustedBaseOffsetX, adjustedBaseOffsetY, onImageOffsetChange, element.id]
  );

  const clipRadius = element.borderRadius || 0;

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      draggable={groupDraggable}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={() => {}}
      onTransformEnd={onTransformEnd}
      onClick={handleClick}
      onTap={handleTap}
      clipFunc={(ctx) => {
        if (clipRadius > 0) {
          const r = clipRadius;
          const w = element.width;
          const h = element.height;
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
        } else {
          ctx.rect(0, 0, element.width, element.height);
        }
      }}
    >
      {resolvedImage ? (
        <KonvaImage
          image={resolvedImage}
          x={imageOffsetX}
          y={imageOffsetY}
          width={finalWidth}
          height={finalHeight}
          draggable={allowImageDrag}
          dragBoundFunc={function (pos) {
            const node = this;
            const parent = node.getParent()!;
            const transform = parent.getAbsoluteTransform().copy();
            transform.invert();
            const localPos = transform.point(pos);
            const minX = element.width - finalWidth;
            const maxX = 0;
            const minY = element.height - finalHeight;
            const maxY = 0;
            const x = Math.max(minX, Math.min(localPos.x, maxX));
            const y = Math.max(minY, Math.min(localPos.y, maxY));
            return parent.getAbsoluteTransform().point({ x, y });
          }}
          onDragStart={handleImageDragStart}
          onDragMove={handleImageDragMove}
          onDragEnd={handleImageDragEnd}
        />
      ) : (
        <>
          <Rect
            width={element.width}
            height={element.height}
            fill="#2a2a3e"
            cornerRadius={clipRadius}
            stroke={isSelected ? '#8b5cf6' : '#4a4a5e'}
            strokeWidth={1}
          />
          <Text
            text="📷"
            width={element.width}
            height={element.height}
            fontSize={48}
            align="center"
            verticalAlign="middle"
          />
          <Text
            text={element.name || 'Drop Image'}
            y={element.height / 2 + 30}
            width={element.width}
            fontSize={16}
            fill="#8b8ba7"
            align="center"
          />
        </>
      )}
    </Group>
  );
});

export default ImageSlotElement;
