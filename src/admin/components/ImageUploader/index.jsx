/**
 * ImageUploader - Single-step image upload with integrated crop and metadata
 * 
 * Design: 60/40 layout (image | form) with all controls on right panel
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import DropZone from './DropZone';
import VariantProgress from './VariantProgress';
import { useImageUpload } from './hooks/useImageUpload';
import { ASPECT_RATIOS, ASPECT_RATIO_LABELS } from './config';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/ui/dialog';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';
import { Slider } from '@/ui/slider';
import { Badge } from '@/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { 
  X, ArrowLeft, Upload, ZoomIn, 
  RotateCw, Focus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authorsAPI } from '@admin/services/api';
import { useImageUploadSettings } from '@admin/hooks/useImageUploadSettings';
import { toast } from 'sonner';

export default function ImageUploader({
  open,
  onOpenChange,
  onUploadComplete,
  defaultFormat = 'webp',
  variantSizes,
}) {
  // State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState('free');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // Focal Point state
  const [focalPoint, setFocalPoint] = useState({ x: 50, y: 50 });
  const [showFocalPoint, setShowFocalPoint] = useState(false);
  const [cropVisuals, setCropVisuals] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const containerRef = useRef(null);

  // Metadata state
  const [format, setFormat] = useState(defaultFormat);
  const [metadata, setMetadata] = useState({
    filename: '',
    altText: '',
    caption: '',
    credit: '',
  });
  
  const { settings } = useImageUploadSettings();

  const { uploadWithVariants, progress, error, abortUpload } = useImageUpload({
    variantSizes,
  });

  // Authors for credit selection
  const [authors, setAuthors] = useState([]);
  const [loadingAuthors, setLoadingAuthors] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setPreviewUrl('');
      setIsUploading(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspect(settings?.defaultAspectRatio || 'free');
      setCroppedAreaPixels(null);
      setFocalPoint({ x: 50, y: 50 });
      setShowFocalPoint(false);
      setFormat(settings?.defaultFormat || defaultFormat);
      setMetadata({ 
        filename: '', 
        altText: '', 
        caption: '', 
        credit: settings?.defaultCredit || '' 
      });
    }
  }, [open, defaultFormat, settings]);

  useEffect(() => {
    if (!open) {
      abortUpload();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    }
  }, [abortUpload, open, previewUrl]);

  // Fetch authors when dialog opens
  useEffect(() => {
    if (open && authors.length === 0) {
      setLoadingAuthors(true);
      authorsAPI.getAll()
        .then(response => {
          const data = response.data?.data || response.data || [];
          setAuthors(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error('Failed to load authors:', err))
        .finally(() => setLoadingAuthors(false));
    }
  }, [open, authors.length]);

  useEffect(() => {
    return () => {
      abortUpload();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [abortUpload, previewUrl]);

  // Reset crop position when aspect ratio changes
  useEffect(() => {
    if (selectedFile && aspect !== 'free') {
      setCrop({ x: 0, y: 0 });
    }
  }, [aspect, selectedFile]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Auto-fill filename without extension
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setMetadata(prev => ({ ...prev, filename: nameWithoutExt }));
  }, [previewUrl]);

  // Handle URL import
  const handleUrlImport = useCallback(async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'imported-image.jpg', { type: blob.type });
      handleFileSelect(file);
    } catch (err) {
      console.error('URL import failed:', err);
    }
  }, [handleFileSelect]);

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Measure crop visuals for focal point
  useEffect(() => {
    if (!selectedFile || !containerRef.current) return;

    let rafId;
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
  }, [selectedFile, showFocalPoint]); // Also measure when focal point mode toggled

  const handleFocalPointClick = useCallback((e) => {
    if (!showFocalPoint || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    if (cropVisuals.width > 0) {
      const clickX = e.clientX - rect.left - cropVisuals.left;
      const clickY = e.clientY - rect.top - cropVisuals.top;
      
      const focalX = Math.max(0, Math.min(100, Math.round((clickX / cropVisuals.width) * 100)));
      const focalY = Math.max(0, Math.min(100, Math.round((clickY / cropVisuals.height) * 100)));
      
      setFocalPoint({ x: focalX, y: focalY });
    }
  }, [showFocalPoint, cropVisuals]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const result = await uploadWithVariants({
        file: selectedFile,
        cropArea: croppedAreaPixels,
        format,
        metadata: {
          name: metadata.filename,
          altText: metadata.altText,
          caption: metadata.caption,
          credit: metadata.credit,
          focalPoint: focalPoint,
          aspectRatio: aspect,
        },
      });

      if (result?.aborted) {
        toast('Upload cancelled');
        return;
      }
      if (result.success) {
        onUploadComplete?.(result.data);
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, croppedAreaPixels, metadata, format, aspect, focalPoint, uploadWithVariants, onUploadComplete, onOpenChange]);

  // Handle cancel/back
  const handleBack = useCallback(() => {
    abortUpload();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setFocalPoint({ x: 50, y: 50 });
  }, [abortUpload, previewUrl]);

  // Handle close
  const handleClose = useCallback(() => {
    abortUpload();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    onOpenChange(false);
  }, [abortUpload, previewUrl, onOpenChange]);

  const handleDialogChange = useCallback((nextOpen) => {
    if (nextOpen) {
      onOpenChange(true);
    } else {
      handleClose();
    }
  }, [handleClose, onOpenChange]);

  const numericAspect = ASPECT_RATIOS[aspect];
  const canUpload = selectedFile && metadata.filename.trim() && metadata.altText.trim();

  // Convert zoom to percentage for display (1-3 range = 0-100%)
  const zoomPercent = Math.round((zoom - 1) * 50);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent 
        className="!max-w-6xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            {selectedFile && !isUploading && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-base font-semibold">
                {isUploading ? 'Uploading...' : selectedFile ? 'Edit & Upload' : 'Upload Image'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isUploading 
                  ? 'Processing...' 
                  : selectedFile 
                    ? 'Crop, set focal point, and add details' 
                    : 'Select or drop an image file'}
              </DialogDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Upload Button in Header */}
            {selectedFile && !isUploading && (
              <Button
                onClick={handleUpload}
                disabled={!canUpload}
                size="sm"
                className="h-8 px-4 gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {/* Step 1: File Selection */}
            {!selectedFile && !isUploading && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 overflow-y-auto"
              >
                <DropZone
                  onFileSelect={handleFileSelect}
                  onUrlImport={handleUrlImport}
                />
              </motion.div>
            )}

            {/* Step 2: Edit & Metadata */}
            {selectedFile && !isUploading && (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden"
              >
                {/* Left: Image Preview Area (60%) */}
                <div 
                  ref={containerRef}
                  className="h-[300px] lg:h-auto lg:flex-1 bg-black relative overflow-hidden"
                >
                  <div className="absolute inset-0">
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      rotation={rotation}
                      aspect={numericAspect}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onRotationChange={setRotation}
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
                        <div className="w-6 h-6 bg-white/20 border-2 border-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Focal Point Hint */}
                    {showFocalPoint && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs pointer-events-none backdrop-blur-sm z-30">
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

                {/* Right: Form Panel */}
                <div className="w-full lg:w-[340px] lg:min-w-[320px] flex flex-col min-h-0 max-h-[50vh] lg:max-h-none border-t lg:border-t-0 lg:border-l bg-background">
                  {/* Scrollable Form Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Filename */}
                    <div className="space-y-1">
                      <Label htmlFor="filename" className="text-xs font-medium">
                        Filename <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="filename"
                        value={metadata.filename}
                        onChange={(e) => setMetadata(prev => ({ ...prev, filename: e.target.value }))}
                        placeholder="my-image-name"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Alt Text */}
                    <div className="space-y-1">
                      <Label htmlFor="altText" className="text-xs font-medium">
                        Alt Text <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="altText"
                        value={metadata.altText}
                        onChange={(e) => setMetadata(prev => ({ ...prev, altText: e.target.value }))}
                        placeholder="Describe for accessibility"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Caption */}
                    <div className="space-y-1">
                      <Label htmlFor="caption" className="text-xs font-medium">Caption</Label>
                      <Input
                        id="caption"
                        value={metadata.caption}
                        onChange={(e) => setMetadata(prev => ({ ...prev, caption: e.target.value }))}
                        placeholder="Optional caption"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Credit (Author) */}
                    <div className="space-y-1">
                      <Label htmlFor="credit" className="text-xs font-medium">Credit</Label>
                      <Select 
                        value={metadata.credit || 'none'} 
                        onValueChange={(value) => setMetadata(prev => ({ ...prev, credit: value === 'none' ? '' : value }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder={loadingAuthors ? 'Loading...' : 'Select author'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {authors.map((author) => (
                            <SelectItem key={author.slug} value={author.name}>
                              {author.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <hr className="border-border" />

                    {/* Output Format */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Output Format</Label>
                      <RadioGroup
                        value={format}
                        onValueChange={setFormat}
                        className="flex gap-6"
                      >
                        <label className="inline-flex items-center cursor-pointer">
                          <RadioGroupItem value="webp" id="format-webp" />
                          <span className="ml-2 text-sm font-medium">WebP</span>
                          <Badge variant="secondary" className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            Recommended
                          </Badge>
                        </label>
                        <label className="inline-flex items-center cursor-pointer">
                          <RadioGroupItem value="avif" id="format-avif" />
                          <span className="ml-2 text-sm font-medium">AVIF</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">Smaller</Badge>
                        </label>
                      </RadioGroup>
                    </div>

                    <hr className="border-border" />

                    {/* Image Adjustments */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Aspect Ratio</Label>
                        <Select value={aspect} onValueChange={setAspect}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select ratio" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(ASPECT_RATIOS).map((ratio) => (
                              <SelectItem key={ratio} value={ratio}>
                                {ASPECT_RATIO_LABELS[ratio] || ratio}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Zoom & Rotate Sliders */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <ZoomIn className="h-3.5 w-3.5" /> Zoom
                            </label>
                            <span className="text-xs font-medium">{zoomPercent}%</span>
                          </div>
                          <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.05}
                            onValueChange={([v]) => setZoom(v)}
                            className="h-1.5"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <RotateCw className="h-3.5 w-3.5" /> Rotate
                            </label>
                            <span className="text-xs font-medium">{rotation}°</span>
                          </div>
                          <Slider
                            value={[rotation]}
                            min={-45}
                            max={45}
                            step={1}
                            onValueChange={([v]) => setRotation(v)}
                            className="h-1.5"
                          />
                        </div>
                      </div>

                      {/* Focal Point Button */}
                      <Button
                        variant={showFocalPoint ? 'default' : 'outline'}
                        onClick={() => setShowFocalPoint(!showFocalPoint)}
                        className="w-full gap-2"
                      >
                        <Focus className="h-4 w-4" />
                        Set Focal Point
                        {showFocalPoint && (
                          <span className="text-xs opacity-70">({focalPoint.x}%, {focalPoint.y}%)</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Uploading */}
            {isUploading && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 h-full flex items-center justify-center"
              >
                <div className="w-full max-w-lg">
                  <VariantProgress progress={progress} error={error} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
