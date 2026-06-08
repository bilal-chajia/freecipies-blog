import { useRef, useCallback } from 'react';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Layer } from 'konva/lib/Layer';
import { SNAP_THRESHOLD } from '@admin/features/templates/components/canvas/utils/canvasConstants';

interface GuideDef {
  orientation: 'V' | 'H';
  lineGuide: number;
  offset?: number;
  snap?: string;
}

interface UseSmartGuidesOptions {
  showGrid?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  onElementChange?: (id: string, props: { x: number; y: number }) => void;
  guidesLayerRef: React.RefObject<Layer | null>;
}

const useSmartGuides = ({
  showGrid = false,
  canvasWidth = 1000,
  canvasHeight = 1500,
  onElementChange,
  guidesLayerRef,
}: UseSmartGuidesOptions) => {
  const gridSize = canvasWidth / 20;
  const guideLinesRef = useRef<Konva.Line[]>([]);

  const clearGuides = useCallback(() => {
    const layer = guidesLayerRef.current;
    if (!layer) return;

    guideLinesRef.current.forEach((line) => {
      line.destroy();
    });
    guideLinesRef.current = [];
    layer.batchDraw();
  }, [guidesLayerRef]);

  const drawGuides = useCallback(
    (guides: GuideDef[]) => {
      const layer = guidesLayerRef.current;
      if (!layer) return;

      // Remove existing guide lines
      guideLinesRef.current.forEach((line) => {
        line.destroy();
      });
      guideLinesRef.current = [];

      const guideColor = '#5900ffff';
      const glowColor = '#5900ffff';

      guides.forEach((guide) => {
        if (guide.orientation === 'V') {
          // Glow line
          const glow = new Konva.Line({
            points: [guide.lineGuide, 0, guide.lineGuide, canvasHeight],
            stroke: glowColor,
            strokeWidth: 3,
            opacity: 0.7,
            listening: false,
          });
          // Main line
          const main = new Konva.Line({
            points: [guide.lineGuide, 0, guide.lineGuide, canvasHeight],
            stroke: guideColor,
            strokeWidth: 3,
            listening: false,
          });
          layer.add(glow);
          layer.add(main);
          guideLinesRef.current.push(glow, main);
        } else {
          // Glow line
          const glow = new Konva.Line({
            points: [0, guide.lineGuide, canvasWidth, guide.lineGuide],
            stroke: glowColor,
            strokeWidth: 4,
            opacity: 0.3,
            listening: false,
          });
          // Main line
          const main = new Konva.Line({
            points: [0, guide.lineGuide, canvasWidth, guide.lineGuide],
            stroke: guideColor,
            strokeWidth: 1,
            listening: false,
          });
          layer.add(glow);
          layer.add(main);
          guideLinesRef.current.push(glow, main);
        }
      });

      layer.batchDraw();
    },
    [guidesLayerRef, canvasWidth, canvasHeight]
  );

  const snapToGrid = useCallback(
    (value: number): number => {
      if (!showGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [showGrid, gridSize]
  );

  const getLineGuideStops = useCallback(
    (_skipShape?: Konva.Node) => {
      return {
        vertical: [0, canvasWidth / 2, canvasWidth],
        horizontal: [0, canvasHeight / 2, canvasHeight],
      };
    },
    [canvasWidth, canvasHeight]
  );

  const getObjectSnappingEdges = useCallback((node: Konva.Node) => {
    const width = node.width();
    const height = node.height();
    const x = node.x();
    const y = node.y();

    return {
      vertical: [
        { guide: Math.round(x), offset: 0, snap: 'start' },
        { guide: Math.round(x + width / 2), offset: Math.round(width / 2), snap: 'center' },
        { guide: Math.round(x + width), offset: Math.round(width), snap: 'end' },
      ],
      horizontal: [
        { guide: Math.round(y), offset: 0, snap: 'start' },
        { guide: Math.round(y + height / 2), offset: Math.round(height / 2), snap: 'center' },
        { guide: Math.round(y + height), offset: Math.round(height), snap: 'end' },
      ],
    };
  }, []);

  const handleDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const node = e.target;

      // Clear previous guides
      clearGuides();

      // Apply grid snapping first if enabled
      if (showGrid) {
        node.position({
          x: snapToGrid(node.x()),
          y: snapToGrid(node.y()),
        });
      }

      // --- Smart Snapping Logic ---
      const guideLines = getLineGuideStops(node);
      const itemBounds = getObjectSnappingEdges(node);
      const newGuides: GuideDef[] = [];

      let minV = SNAP_THRESHOLD;
      let minH = SNAP_THRESHOLD;

      // Find vertical snap (X axis)
      itemBounds.vertical.forEach((bound) => {
        guideLines.vertical.forEach((line) => {
          const diff = Math.abs(line - bound.guide);
          if (diff < minV) {
            minV = diff;
            // Snap the node
            node.x(line - bound.offset);
            newGuides.push({
              orientation: 'V',
              lineGuide: line,
              offset: bound.offset,
              snap: bound.snap,
            });
          }
        });
      });

      // Find horizontal snap (Y axis)
      itemBounds.horizontal.forEach((bound) => {
        guideLines.horizontal.forEach((line) => {
          const diff = Math.abs(line - bound.guide);
          if (diff < minH) {
            minH = diff;
            // Snap the node
            node.y(line - bound.offset);
            newGuides.push({
              orientation: 'H',
              lineGuide: line,
              offset: bound.offset,
              snap: bound.snap,
            });
          }
        });
      });

      if (newGuides.length > 0) {
        drawGuides(newGuides);
      }
    },
    [showGrid, snapToGrid, getLineGuideStops, getObjectSnappingEdges, clearGuides, drawGuides]
  );

  const handleDragEnd = useCallback(
    (id: string, e: KonvaEventObject<DragEvent>) => {
      clearGuides();
      onElementChange?.(id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    [clearGuides, onElementChange]
  );

  const handleTransformMove = useCallback(
    (e: KonvaEventObject<Event>) => {
      const node = e.target;

      // Calculate actual position and size after transform
      const x = node.x();
      const y = node.y();
      const width = node.width() * node.scaleX();
      const height = node.height() * node.scaleY();

      const newGuides: GuideDef[] = [];
      const guideLines = {
        vertical: [0, canvasWidth / 2, canvasWidth],
        horizontal: [0, canvasHeight / 2, canvasHeight],
      };

      // Check all edges of the element for snapping
      const elementEdges = {
        vertical: [x, x + width / 2, x + width],
        horizontal: [y, y + height / 2, y + height],
      };

      // Find vertical guides (X axis)
      elementEdges.vertical.forEach((edge) => {
        guideLines.vertical.forEach((line) => {
          if (Math.abs(edge - line) < SNAP_THRESHOLD) {
            newGuides.push({ orientation: 'V', lineGuide: line });
          }
        });
      });

      // Find horizontal guides (Y axis)
      elementEdges.horizontal.forEach((edge) => {
        guideLines.horizontal.forEach((line) => {
          if (Math.abs(edge - line) < SNAP_THRESHOLD) {
            newGuides.push({ orientation: 'H', lineGuide: line });
          }
        });
      });

      if (newGuides.length > 0) {
        drawGuides(newGuides);
      } else {
        clearGuides();
      }
    },
    [canvasWidth, canvasHeight, clearGuides, drawGuides]
  );

  return {
    handleDragMove,
    handleDragEnd,
    handleTransformMove,
    clearGuides,
    snapToGrid,
  };
};

export default useSmartGuides;
