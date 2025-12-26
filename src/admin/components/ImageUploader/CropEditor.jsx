/**
 * CropEditor - Interactive crop with aspect ratio selection and focal point
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'motion/react';
import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import { ArrowLeft, Check, ZoomIn, RotateCw, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import getCroppedImg from './utils/cropImage';
import { ASPECT_RATIOS } from './config';

// Re-export as ASPECT_RATIO_MAP for backwards compatibility
const ASPECT_RATIO_MAP = ASPECT_RATIOS;

export default function CropEditor({
  imageUrl,
  aspect,
  onAspectChange,
  aspectRatios,
  focalPoint,
  onFocalPointChange,
  onCropComplete,
  onBack,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState(null);
  const [showFocalPoint, setShowFocalPoint] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Track the actual visual crop area dimensions for precise focal point positioning
  const [cropVisuals, setCropVisuals] = useState({ left: 0, top: 0, width: 0, height: 0 });
  
  const containerRef = useRef(null);

  const numericAspect = ASPECT_RATIO_MAP[aspect] ?? undefined;

  const handleCropChange = useCallback((crop) => {
    setCrop(crop);
  }, []);

  const handleZoomChange = useCallback((zoom) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
    setCroppedAreaPercent(croppedArea);
  }, []);

  // Robust measurement using ResizeObserver - FIXED: throttled and prevents infinite loops
  useEffect(() => {
    if (!showFocalPoint) return;

    const container = containerRef.current;
    if (!container) return;

    let rafId;
    let lastMeasure = 0;
    const THROTTLE_MS = 50; // Throttle to ~20fps max

    const measure = () => {
      const now = Date.now();
      if (now - lastMeasure < THROTTLE_MS) return;
      lastMeasure = now;

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

        // Only update if values actually changed (prevents re-render loops)
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

    // Initial measure
    measure();

    // Only use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    resizeObserver.observe(container);

    // Single delayed measure for layout settling
    const timeoutId = setTimeout(measure, 200);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [showFocalPoint]); // FIXED: Removed crop/zoom/rotation dependencies

  const handleFocalPointClick = useCallback((e) => {
    if (!showFocalPoint || !croppedAreaPercent) return;
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    
    // Get click position relative to the crop area
    if (cropVisuals.width > 0) {
      const clickX = e.clientX - rect.left - cropVisuals.left;
      const clickY = e.clientY - rect.top - cropVisuals.top;
      
      const focalX = Math.max(0, Math.min(100, Math.round((clickX / cropVisuals.width) * 100)));
      const focalY = Math.max(0, Math.min(100, Math.round((clickY / cropVisuals.height) * 100)));
      
      onFocalPointChange({ x: focalX, y: focalY });
    }
  }, [showFocalPoint, croppedAreaPercent, cropVisuals, onFocalPointChange]);

  const handleApplyCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;
    
    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels, rotation);
      onCropComplete(croppedBlob, {
        crop: croppedAreaPixels,
        rotation,
        aspect,
      });
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setProcessing(false);
    }
  }, [imageUrl, croppedAreaPixels, rotation, aspect, onCropComplete]);

  return (
    <div className="space-y-6">
      {/* Crop Preview */}
      <div 
        ref={containerRef}
        className="relative h-[400px] bg-black/90 rounded-lg overflow-hidden select-none group"
        onClick={handleFocalPointClick}
      >
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={numericAspect}
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          onCropComplete={onCropCompleteInternal}
          showGrid={true}
          classes={{
            cropAreaClassName: 'focal-point-reference ring-2 ring-white/50' 
          }}
        />

        {/* Focal Point Indicator */}
        {showFocalPoint && cropVisuals.width > 0 && (
          <motion.div
            className="absolute z-20"
            style={{
              left: cropVisuals.left + (cropVisuals.width * focalPoint.x / 100),
              top: cropVisuals.top + (cropVisuals.height * focalPoint.y / 100),
              x: '-50%',
              y: '-50%',
              pointerEvents: 'none', // Ensure clicks pass through to container
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="relative">
              <Crosshair className="h-8 w-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              <div className="absolute inset-0 animate-ping">
                <Crosshair className="h-8 w-8 text-white/80" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Aspect Ratios */}
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Aspect Ratio
          </Label>
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((ratio) => (
              <Button
                key={ratio}
                variant={aspect === ratio ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAspectChange(ratio)}
              >
                {ratio === 'free' ? 'Free' : ratio}
              </Button>
            ))}
          </div>
        </div>

        {/* Right: Zoom & Rotation */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                <ZoomIn className="h-3 w-3 inline mr-1" />
                Zoom
              </Label>
              <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={([v]) => setZoom(v)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                <RotateCw className="h-3 w-3 inline mr-1" />
                Rotation
              </Label>
              <span className="text-xs text-muted-foreground">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={([v]) => setRotation(v)}
            />
          </div>
        </div>
      </div>

      {/* Focal Point Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showFocalPoint ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFocalPoint(!showFocalPoint)}
        >
          <Crosshair className="h-4 w-4 mr-2" />
          {showFocalPoint ? 'Click image to set focal point' : 'Set Focal Point'}
        </Button>
        {showFocalPoint && (
          <span className="text-sm text-muted-foreground">
            Current: {focalPoint.x}%, {focalPoint.y}%
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleApplyCrop} disabled={processing}>
          <Check className="h-4 w-4 mr-2" />
          {processing ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
