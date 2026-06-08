import React, { memo, useCallback } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type {
  EditorElement,
  TextElement as TextElementType,
  ImageSlotElement as ImageSlotElementType,
  ShapeElement as ShapeElementType,
  LogoElement as LogoElementType,
  OverlayElement as OverlayElementType,
} from '@admin/features/templates/store';
import ImageSlotElement from './ImageSlotElement';
import TextElementComponent from './TextElement';
import ShapeElement from './ShapeElement';
import LogoElement from './LogoElement';
import OverlayElement from './OverlayElement';

interface ElementRendererProps {
  element: EditorElement;
  isSelected: boolean;
  isLocked: boolean;
  editable: boolean;
  loadedImage: CanvasImageSource | null;
  logoImage: CanvasImageSource | null;
  articleData: Record<string, unknown> | null;
  replaceVariables: (text: string) => string;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (id: string, e: KonvaEventObject<DragEvent>) => void;
  onTransformStart?: () => void;
  onTransformEnd?: (id: string, e: KonvaEventObject<Event>) => void;
  onElementChange: (id: string, updates: Partial<EditorElement>) => void;
  onImageOffsetChange?: (id: string, offset: { x: number; y: number }) => void;
  onTextDoubleClick: (element: TextElementType, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  allowImageDrag?: boolean;
  selectedId: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

const ElementRenderer = memo(function ElementRenderer({
  element,
  isSelected,
  isLocked,
  editable,
  loadedImage,
  logoImage,
  articleData,
  replaceVariables,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  onElementChange,
  onImageOffsetChange,
  onTextDoubleClick,
  allowImageDrag = false,
  selectedId,
  canvasWidth,
  canvasHeight,
}: ElementRendererProps) {
  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!isLocked && onDragEnd) {
        onDragEnd(element.id, e);
      }
    },
    [isLocked, element.id, onDragEnd]
  );

  // Bridge: child components call onTransformEnd(e), parent wants (id, e)
  const handleTransformEnd: (e: KonvaEventObject<Event>) => void = (e) => {
    if (!isLocked && onTransformEnd) {
      onTransformEnd(element.id, e);
    }
  };

  const imageScale = (articleData?.imageScales as Record<string, number> | undefined)?.[element.id] ?? 1;
  const imageOffset = (articleData?.imageOffsets as Record<string, { x: number; y: number }> | undefined)?.[element.id] ?? { x: 0, y: 0 };

  switch (element.type) {
    case 'imageSlot': {
      const imgEl = element as ImageSlotElementType;
      return (
        <ImageSlotElement
          key={imgEl.id}
          element={imgEl}
          image={loadedImage}
          fallbackImage={null}
          imageScale={imageScale}
          imageOffset={imageOffset}
          allowImageDrag={allowImageDrag}
          selectedId={selectedId}
          editable={editable}
          onSelect={onSelect}
          onTransformEnd={handleTransformEnd}
          onImageOffsetChange={onImageOffsetChange}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    }

    case 'text': {
      const textEl = element as TextElementType;
      let text = textEl.content || '';
      if (textEl.content?.includes('{{')) {
        text = replaceVariables(text);
      }
      if (textEl.textTransform === 'uppercase') {
        text = text.toUpperCase();
      } else if (textEl.textTransform === 'lowercase') {
        text = text.toLowerCase();
      } else if (textEl.textTransform === 'capitalize') {
        text = text.replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      return (
        <TextElementComponent
          key={textEl.id}
          element={textEl}
          displayText={text}
          editable={editable}
          onSelect={onSelect}
          onTransformEnd={handleTransformEnd}
          onElementChange={onElementChange}
          onTextDoubleClick={onTextDoubleClick}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={handleDragEnd}
          onTransformStart={onTransformStart}
        />
      );
    }

    case 'shape': {
      const shapeEl = element as ShapeElementType;
      return (
        <ShapeElement
          key={shapeEl.id}
          element={shapeEl}
          editable={editable}
          onSelect={onSelect}
          onTransformEnd={handleTransformEnd}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    }

    case 'logo': {
      const logoEl = element as LogoElementType;
      return (
        <LogoElement
          key={logoEl.id}
          element={logoEl}
          image={logoImage}
          editable={editable}
          onSelect={onSelect}
          onTransformEnd={handleTransformEnd}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    }

    case 'overlay': {
      const overlayEl = element as OverlayElementType;
      return (
        <OverlayElement
          key={overlayEl.id}
          element={overlayEl}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          editable={editable}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={handleDragEnd}
        />
      );
    }

    default:
      return null;
  }
});

export default ElementRenderer;
