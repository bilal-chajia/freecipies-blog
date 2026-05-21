import React, { memo, useCallback, useMemo } from 'react';
import { Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { EditorElement, TextElement as TextElementType } from '@admin/features/templates/store';

interface TextElementProps {
  element: TextElementType;
  displayText: string;
  editable: boolean;
  onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
  onElementChange: (id: string, updates: Partial<EditorElement>) => void;
  onTextDoubleClick: (element: TextElementType, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void;
  onTransformStart?: () => void;
}

const TextElement = memo(function TextElement({
  element,
  displayText,
  editable,
  onSelect,
  onTransformEnd,
  onElementChange,
  onTextDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
}: TextElementProps) {
  const isLocked = element.locked;
  const baseFontSize = element.fontSize || 32;
  const lineHeight = element.lineHeight || 1.2;
  const width = element.width || 300;
  const height = element.height || 100;

  const effect = element.effect || { type: 'none' };

  const effectProps = useMemo(() => {
    switch (effect.type) {
      case 'shadow': {
        const offsetVal = effect.offset || 50;
        const dir = ((effect.direction || 45) * Math.PI) / 180;
        return {
          shadowColor: effect.color || 'rgba(0,0,0,0.5)',
          shadowBlur: (effect.blur || 50) / 10,
          shadowOffsetX: offsetVal * 0.1 * Math.cos(dir),
          shadowOffsetY: offsetVal * 0.1 * Math.sin(dir),
          shadowOpacity: 1 - (effect.transparency || 40) / 100,
        };
      }
      case 'lift':
        return {
          shadowColor: 'rgba(0,0,0,0.4)',
          shadowBlur: (effect.blur || 50) / 5,
          shadowOffsetX: 0,
          shadowOffsetY: 15,
          shadowOpacity: 0.5,
        };
      case 'hollow':
        return {
          stroke: element.color || '#000000',
          strokeWidth: (effect.thickness || 50) / 25,
          fillEnabled: false,
        };
      case 'outline':
        return {
          stroke: effect.color || '#000000',
          strokeWidth: (effect.thickness || 50) / 15,
        };
      case 'echo': {
        const offsetVal = (effect.offset || 50) / 10;
        return {
          shadowColor: effect.color || '#000000',
          shadowBlur: 0,
          shadowOffsetX: -offsetVal,
          shadowOffsetY: 0,
          shadowOpacity: 0.5,
        };
      }
      case 'glitch': {
        const offsetVal = (effect.offset || 50) / 20;
        return {
          shadowColor: '#ff00ff',
          shadowBlur: 0,
          shadowOffsetX: offsetVal,
          shadowOffsetY: -offsetVal,
          shadowOpacity: 0.7,
        };
      }
      case 'neon':
        return {
          shadowColor: effect.color || '#ff00ff',
          shadowBlur: (effect.blur || 50) / 2,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowOpacity: 1,
        };
      case 'splice': {
        const offsetVal = (effect.offset || 50) / 10;
        return {
          stroke: element.color || '#000000',
          strokeWidth: (effect.thickness || 50) / 25,
          fillEnabled: false,
          shadowColor: effect.color || '#cccccc',
          shadowBlur: 0,
          shadowOffsetX: offsetVal,
          shadowOffsetY: offsetVal,
          shadowOpacity: 1,
        };
      }
      default:
        return {};
    }
  }, [effect, element.color]);

  const fontSize = useMemo(() => {
    const hasVariables = element.content?.includes('{{');
    const shouldAutoFit = element.autoFit !== false && (hasVariables || element.autoFit === true);
    if (!shouldAutoFit || !displayText) return baseFontSize;

    // Binary search for optimal font size using Konva.Text constructor
    let minSize = 10;
    let maxSize = baseFontSize;

    while (maxSize - minSize > 1) {
      const testSize = Math.floor((minSize + maxSize) / 2);
      const testText = new Konva.Text({
        text: displayText,
        width,
        fontSize: testSize,
        fontFamily: element.fontFamily || 'Inter, sans-serif',
        fontStyle: `${element.fontStyle === 'italic' ? 'italic ' : ''}${element.fontWeight === 'bold' ? 'bold' : ''}`.trim() || 'normal',
        lineHeight,
        wrap: 'word',
      });
      const textHeight = testText.height();
      testText.destroy();

      if (textHeight <= height) {
        minSize = testSize;
      } else {
        maxSize = testSize;
      }
    }
    return minSize;
  }, [displayText, baseFontSize, width, height, lineHeight, element.content, element.autoFit, element.fontFamily, element.fontStyle, element.fontWeight]);

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

  const handleDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isLocked) onTextDoubleClick(element, e);
    },
    [isLocked, element, onTextDoubleClick]
  );

  const handleDblTap = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isLocked) onTextDoubleClick(element, e);
    },
    [isLocked, element, onTextDoubleClick]
  );

  const handleTransform = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (isLocked) return;
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const newWidth = Math.max(50, node.width() * scaleX);
      const newHeight = Math.max(30, node.height() * scaleY);
      const scale = Math.max(scaleX, scaleY);
      const newFontSize = Math.round((element.fontSize || 32) * scale);
      node.width(newWidth);
      node.height(newHeight);
      // Real-time updates deferred to TransformEnd to avoid store thrashing
      // We only update the Konva node for visual feedback
    },
    [isLocked, element.fontSize]
  );

  const handleTransformEndLocal = useCallback(
    (e: KonvaEventObject<Event>) => {
      if (isLocked) return;
      onTransformStart?.();
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const currentFontSize = element.fontSize || 32;
      const scale = Math.max(scaleX, scaleY);
      const newFontSize = Math.round(currentFontSize * scale);
      const newWidth = Math.round(node.width() * scaleX);
      onTransformEnd(e);
      onElementChange(element.id, {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        fontSize: newFontSize,
        rotation: node.rotation(),
      });
    },
    [isLocked, element.id, element.fontSize, onTransformEnd, onElementChange, onTransformStart]
  );

  const fontStyleStr = useMemo(() => {
    const italic = element.fontStyle === 'italic' ? 'italic' : '';
    const weight = element.fontWeight === 'normal' ? '' : (element.fontWeight || '');
    return [italic, weight].filter(Boolean).join(' ') || 'normal';
  }, [element.fontStyle, element.fontWeight]);

  return (
    <Text
      id={element.id}
      x={element.x}
      y={element.y}
      text={displayText || 'Text'}
      width={width}
      height={height}
      fontSize={fontSize}
      fontFamily={element.fontFamily || 'Inter, sans-serif'}
      fontStyle={fontStyleStr}
      fill={effectProps.fillEnabled === false ? 'transparent' : element.color || '#ffffff'}
      align={element.textAlign || 'center'}
      verticalAlign="middle"
      letterSpacing={element.letterSpacing || 0}
      lineHeight={lineHeight}
      textDecoration={element.textDecoration || ''}
      {...effectProps}
      wrap="word"
      ellipsis={false}
      rotation={element.rotation || 0}
      draggable={!isLocked && editable}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEndLocal}
      onClick={handleClick}
      onTap={handleTap}
      onDblClick={handleDblClick}
      onDblTap={handleDblTap}
    />
  );
});

export default TextElement;
