/**
 * useCanvasExport.ts
 * ==================
 * Extracted, optimized canvas-to-image export hook.
 *
 * Optimizations:
 * - CSP-safe data URL to Blob conversion without network fetch
 * - Thread-safe via isExporting ref
 * - Transformer hidden during export, restored after
 */

import { useRef, useCallback } from 'react';
import type Konva from 'konva';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ExportFormat = 'png' | 'jpeg' | 'jpg' | 'webp';

export interface UseCanvasExportOptions {
  stageRef: React.RefObject<Konva.Stage | null>;
  transformerRef: React.RefObject<Konva.Transformer | null>;
  canvasWidth: number;
  canvasHeight: number;
  actualScale: number;
  selectedId?: string | null;
  clearGuides?: () => void;
}

export interface UseCanvasExportResult {
  exportToImage: (format?: ExportFormat, quality?: number) => Promise<Blob | null>;
  isExporting: boolean;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta = '', base64 = ''] = dataUrl.split(',');
  const mimeType = meta.match(/^data:([^;]+);base64$/)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useCanvasExport({
  stageRef,
  transformerRef,
  canvasWidth,
  canvasHeight,
  actualScale,
  selectedId = null,
  clearGuides,
}: UseCanvasExportOptions): UseCanvasExportResult {
  const isExportingRef = useRef(false);

  const exportToImage = useCallback(
    async (format: ExportFormat = 'png', quality: number = 1): Promise<Blob | null> => {
      const stage = stageRef.current;
      if (!stage || isExportingRef.current) return null;

      isExportingRef.current = true;

      try {
        // Hide transformer and guides for export
        const prevNodes = transformerRef.current?.nodes() ?? [];
        transformerRef.current?.nodes([]);
        clearGuides?.();

        // Calculate canvas position on stage
        const stageW = stage.width();
        const stageH = stage.height();
        const handlePadding = 100;
        const exportStageW = Math.max(
          stageW,
          (canvasWidth + handlePadding * 2) * actualScale
        );
        const exportStageH = Math.max(
          stageH,
          (canvasHeight + handlePadding * 2) * actualScale
        );
        const offsetX = (exportStageW / actualScale - canvasWidth) / 2;
        const offsetY = (exportStageH / actualScale - canvasHeight) / 2;

        const mimeType =
          format === 'webp'
            ? 'image/webp'
            : format === 'jpeg' || format === 'jpg'
              ? 'image/jpeg'
              : 'image/png';

        const dataUrl = stage.toDataURL({
          x: offsetX * actualScale,
          y: offsetY * actualScale,
          width: canvasWidth * actualScale,
          height: canvasHeight * actualScale,
          pixelRatio: 1 / actualScale,
          mimeType,
          quality,
        });

        // Restore transformer
        if (selectedId && transformerRef.current) {
          const selectedNode = stage.findOne(`#${selectedId}`);
          if (selectedNode) {
            transformerRef.current.nodes([selectedNode]);
          } else if (prevNodes.length > 0) {
            transformerRef.current.nodes(prevNodes);
          }
        } else if (prevNodes.length > 0 && transformerRef.current) {
          transformerRef.current.nodes(prevNodes);
        }

        return dataUrlToBlob(dataUrl);
      } finally {
        isExportingRef.current = false;
      }
    },
    [stageRef, transformerRef, canvasWidth, canvasHeight, actualScale, selectedId, clearGuides]
  );

  return {
    exportToImage,
    isExporting: isExportingRef.current,
  };
}

export default useCanvasExport;
