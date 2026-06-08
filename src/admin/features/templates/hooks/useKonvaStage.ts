import { useState, useEffect, useMemo } from 'react';

interface UseKonvaStageOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * useKonvaStage - Hook to handle dynamic canvas dimension calculations,
 * zoom scaling, and stage centering in the templates editor.
 */
export default function useKonvaStage({
  containerRef,
  scale,
  zoom,
  canvasWidth,
  canvasHeight,
}: UseKonvaStageOptions) {
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Track container size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Calculate actual scale based on base scale & zoom
  const actualScale = useMemo(() => scale * (zoom / 100), [scale, zoom]);

  // Stage must be large enough to show transformer handles outside canvas
  const handlePadding = 100;
  const stageWidth = useMemo(() => {
    return Math.max(containerSize.width, (canvasWidth + handlePadding * 2) * actualScale);
  }, [containerSize.width, canvasWidth, actualScale]);

  const stageHeight = useMemo(() => {
    return Math.max(containerSize.height, (canvasHeight + handlePadding * 2) * actualScale);
  }, [containerSize.height, canvasHeight, actualScale]);

  // Center the canvas within the Stage
  const canvasOffsetX = useMemo(() => {
    return (stageWidth / actualScale - canvasWidth) / 2;
  }, [stageWidth, actualScale, canvasWidth]);

  const canvasOffsetY = useMemo(() => {
    return (stageHeight / actualScale - canvasHeight) / 2;
  }, [stageHeight, actualScale, canvasHeight]);

  return {
    containerSize,
    actualScale,
    stageWidth,
    stageHeight,
    canvasOffsetX,
    canvasOffsetY,
  };
}
