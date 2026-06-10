import { useState, useEffect, useCallback } from 'react';
import type { EditorElement, TextElement } from '@admin/features/templates/store';

interface UseElementTransformOptions {
  stageRef: React.RefObject<any>;
  transformerRef: React.RefObject<any>;
  elements: EditorElement[];
  selectedIds: Set<string>;
  editable: boolean;
  handleElementChange: (id: string, newProps: Partial<EditorElement>) => void;
}

/**
 * useElementTransform - Hook to encapsulate Konva element transformation logic,
 * transformer handle styling, and real-time/end transformation calculations.
 */
export default function useElementTransform({
  stageRef,
  transformerRef,
  elements,
  selectedIds,
  editable,
  handleElementChange,
}: UseElementTransformOptions) {
  const [isTransforming, setIsTransforming] = useState(false);

  // === TRANSFORMER CUSTOMIZATION (Canva-like pills and circles) ===
  useEffect(() => {
    if (transformerRef.current) {
      if (typeof transformerRef.current.anchorStyleFunc === 'function') {
        transformerRef.current.anchorStyleFunc((anchor: any) => {
          const name = anchor.name();

          // Reset standard styles
          anchor.fill('#ffffff');
          anchor.stroke('#8b5cf6');
          anchor.strokeWidth(1);

          // Specific shapes based on position
          if (name.includes('middle')) {
            // Side handles -> Vertical pills
            anchor.cornerRadius(10);
            anchor.width(6);
            anchor.height(20);
          } else if (name.includes('center')) {
            // Top/Bottom handles -> Horizontal pills
            anchor.cornerRadius(10);
            anchor.width(20);
            anchor.height(6);
          } else {
            // Corner handles -> Circles
            anchor.cornerRadius(50);
            anchor.width(10);
            anchor.height(10);
          }
        });
      }
    }
  }, [editable, selectedIds, transformerRef]);

  // === UPDATE TRANSFORMER NODES ON SELECTION CHANGES ===
  useEffect(() => {
    if (transformerRef.current && stageRef.current && editable) {
      const stage = stageRef.current;
      if (selectedIds.size > 0) {
        // Find all selected nodes, but EXCLUDE locked elements
        const selectedNodes = [...selectedIds]
          .map((id) => {
            const element = elements.find((el) => el.id === id);
            // Skip locked elements - they shouldn't have transformer
            if (element?.locked) return null;
            return stage.findOne(`#${id}`);
          })
          .filter((node) => node !== null && node !== undefined);

        if (selectedNodes.length > 0) {
          // For single selection, check element type for keepRatio
          if (selectedNodes.length === 1) {
            const element = elements.find((el) => el.id === [...selectedIds][0]);
            if (element?.type === 'image_slot') {
              transformerRef.current.keepRatio(true);
            } else {
              transformerRef.current.keepRatio(false);
            }
          } else {
            // For multiple selection, use uniform scaling
            transformerRef.current.keepRatio(true);
          }

          transformerRef.current.nodes(selectedNodes);
          transformerRef.current.getLayer()?.batchDraw();
        } else {
          // All selected are locked, hide transformer
          transformerRef.current.nodes([]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedIds, elements, editable, stageRef, transformerRef]);

  const handleTransformStart = useCallback(() => {
    setIsTransforming(true);
  }, []);

  const handleTransformEnd = useCallback(
    (id: string, e: any) => {
      setIsTransforming(false);
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale
      node.scaleX(1);
      node.scaleY(1);

      const element = elements.find((el) => el.id === id);

      if (element?.type === 'text') {
        // For text: position and rotation only (dimensions already updated in handleTextTransform)
        handleElementChange(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        });
      } else {
        // For standard elements: apply scale to dimensions
        handleElementChange(id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(20, node.width() * scaleX),
          height: Math.max(20, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }
    },
    [elements, handleElementChange]
  );

  const handleTextTransformStart = useCallback((e: any, element: EditorElement) => {
    const node = e.target;
    node.setAttr('_originalFontSize', (element as TextElement).font_size || 32);
    node.setAttr('_originalWidth', element.width || 300);
  }, []);

  const handleTextTransform = useCallback(
    (id: string, e: any) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      const originalFontSize = node.getAttr('_originalFontSize') || 32;
      const originalWidth = node.getAttr('_originalWidth') || 300;

      const avgScale = (scaleX + scaleY) / 2;
      const newFontSize = Math.max(10, Math.round(originalFontSize * avgScale));
      const newWidth = Math.max(50, Math.round(originalWidth * scaleX));

      handleElementChange(id, {
        font_size: newFontSize,
        width: newWidth,
      });

      node.setAttrs({
        scaleX: 1,
        scaleY: 1,
      });
    },
    [handleElementChange]
  );

  return {
    isTransforming,
    setIsTransforming,
    handleTransformStart,
    handleTransformEnd,
    handleTextTransformStart,
    handleTextTransform,
  };
}
