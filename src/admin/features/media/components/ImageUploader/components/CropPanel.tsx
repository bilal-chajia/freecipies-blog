/**
 * CropPanel - Image crop area with focal point support
 */

import { useRef, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'motion/react';

interface Point {
  x: number;
  y: number;
}

interface CropPanelProps {
  previewUrl: string;
  crop: Point;
  zoom: number;
  rotation: number;
  aspect: number;
  focalPoint: Point;
  showFocalPoint: boolean;
  onCropChange: (crop: Point) => void;
  onZoomChange: (zoom: number) => void;
  onRotationChange: (rotation: number) => void;
  onCropComplete: (croppedArea: unknown, croppedAreaPixels: unknown) => void;
  onFocalPointClick: (point: Point) => void;
}

export default function CropPanel({
  previewUrl,
  crop,
  zoom,
  rotation,
  aspect,
  focalPoint,
  showFocalPoint,
  onCropChange,
  onZoomChange,
  onRotationChange,
  onCropComplete,
  onFocalPointClick,
}: CropPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cropVisuals, setCropVisuals] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Measure crop visuals for focal point positioning
  useEffect(() => {
    if (!containerRef.current) return;

    let rafId: number;
    let lastMeasure = 0;
    const THROTTLE_MS = 50;

    const measure = () => {
      const now = Date.now();
      if (now - lastMeasure < THROTTLE_MS) return;
      lastMeasure = now;

      const container = containerRef.current;
      if (!container) return;

      const cropEl = container.querySelector('.focal-point-reference');
      if (cropEl) {
        const containerRect = container.getBoundingClientRect();
        const cropRect = cropEl.getBoundingClientRect();

        const newVisuals = {
          left: cropRect.left - containerRect.left,
          top: cropRect.top - containerRect.top,
          width: cropRect.width,
          height: cropRect.height,
        };

        setCropVisuals(prev =>
          prev.left === newVisuals.left &&
            prev.top === newVisuals.top &&
            prev.width === newVisuals.width &&
            prev.height === newVisuals.height
            ? prev
            : newVisuals
        );
      }
    };

    measure();
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    resizeObserver.observe(containerRef.current);
    const timeoutId = setTimeout(measure, 200);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleFocalPointClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showFocalPoint || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    if (cropVisuals.width > 0) {
      const clickX = e.clientX - rect.left - cropVisuals.left;
      const clickY = e.clientY - rect.top - cropVisuals.top;

      const focalX = Math.max(0, Math.min(100, Math.round((clickX / cropVisuals.width) * 100)));
      const focalY = Math.max(0, Math.min(100, Math.round((clickY / cropVisuals.height) * 100)));

      onFocalPointClick({ x: focalX, y: focalY });
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-[300px] lg:h-auto lg:flex-1 bg-background relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <Cropper
          image={previewUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onRotationChange={onRotationChange}
          onCropComplete={onCropComplete}
          showGrid={true}
          classes={{
            cropAreaClassName: 'focal-point-reference'
          }}
        />

        {/* Focal Point Indicator */}
        {showFocalPoint && cropVisuals.width > 0 && (
          <motion.div
            className="absolute z-20 pointer-events-none"
            style={{
              left: cropVisuals.left + (cropVisuals.width * focalPoint.x / 100),
              top: cropVisuals.top + (cropVisuals.height * focalPoint.y / 100),
              x: '-50%',
              y: '-50%',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <div className="size-6 bg-background/80 border-2 border-primary rounded-full shadow-lg flex items-center justify-center">
              <div className="size-1.5 bg-primary rounded-full" />
            </div>
          </motion.div>
        )}

        {/* Focal Point Hint */}
        {showFocalPoint && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 text-foreground px-3 py-1.5 rounded-full text-xs pointer-events-none backdrop-blur-sm z-30">
            Click on the image to set focal point
          </div>
        )}

        {/* Click Capture Layer for Focal Point - on top of Cropper */}
        {showFocalPoint && (
          <div
            className="absolute inset-0 z-10 cursor-crosshair"
            onClick={handleFocalPointClick}
            style={{ backgroundColor: 'transparent' }}
          />
        )}
      </div>
    </div>
  );
}
