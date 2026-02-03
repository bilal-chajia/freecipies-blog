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
import { Progress } from '@/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import {
  X, ArrowLeft, Upload, ZoomIn,
  RotateCw, Focus, RefreshCw, Link
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
  allowMultiple = false,
}) {
  // State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Queue state for bulk upload
  const [queue, setQueue] = useState([]);
  // -1 = queue view, 0+ = editing item at index
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  // Alt text from first image to auto-fill subsequent images
  const [sharedAltText, setSharedAltText] = useState('');
  // Progress bar visibility with delayed hide
  const [showProgressBar, setShowProgressBar] = useState(false);
  const progressBarTimeoutRef = useRef(null);

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
      // Reset queue state
      setQueue([]);
      setCurrentQueueIndex(-1);
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

  // Progress bar visibility - stays visible while uploading, disappears when all done
  useEffect(() => {
    const hasUploading = allowMultiple && queue.some(q => q.status === 'uploading');
    const hasPending = allowMultiple && queue.some(q => q.status === 'pending');

    if (hasUploading) {
      // Clear any pending hide timeout
      if (progressBarTimeoutRef.current) {
        clearTimeout(progressBarTimeoutRef.current);
        progressBarTimeoutRef.current = null;
      }
      // Show immediately
      setShowProgressBar(true);
    } else if (showProgressBar && !hasPending) {
      // Only hide when no more pending AND no more uploading (delay 4s)
      progressBarTimeoutRef.current = setTimeout(() => {
        setShowProgressBar(false);
      }, 4000);
    }

    return () => {
      if (progressBarTimeoutRef.current) {
        clearTimeout(progressBarTimeoutRef.current);
      }
    };
  }, [allowMultiple, queue, showProgressBar]);

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

    // Reset ALL metadata for new image (clear previous values)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setMetadata({
      filename: nameWithoutExt,
      altText: '',
      caption: '',
      credit: settings?.defaultCredit || '',
    });

    // Reset crop/zoom/rotation for new image
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFocalPoint({ x: 50, y: 50 });
  }, [previewUrl, settings]);

  // Handle URL import - fetch via proxy to avoid CORS, then load into cropper
  const handleUrlImport = useCallback(async (url) => {
    try {
      const token = localStorage.getItem('admin_token');
      // Fetch image through our proxy endpoint (bypasses CORS)
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();

      // Extract filename from URL
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split('/').pop() || `imported-${Date.now()}.jpg`;

      // Create File object and load into cropper
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      handleFileSelect(file);

    } catch (err) {
      console.error('URL import failed:', err);
      toast.error(`Import failed: ${err.message}`);
    }
  }, [handleFileSelect]);

  // Handle multiple files dropped/selected - add to queue
  const handleFilesSelect = useCallback((files) => {
    const newItems = files.map(file => ({
      id: crypto.randomUUID(),
      type: 'file',
      source: file,
      name: file.name,
      status: 'pending',
      previewUrl: URL.createObjectURL(file),
    }));
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  // Handle multiple URLs pasted - add to queue with preview fetching
  const handleUrlsImport = useCallback(async (urls) => {
    const newItems = urls.map(url => ({
      id: crypto.randomUUID(),
      type: 'url',
      source: url,
      name: url.split('/').pop()?.split('?')[0] || 'imported',
      status: 'pending',
      previewUrl: null, // Will be fetched below
    }));

    // Add items immediately (with loading state)
    setQueue(prev => [...prev, ...newItems]);

    // Get auth token for proxy requests
    const token = localStorage.getItem('admin_token');

    // Fetch preview images in background
    for (const item of newItems) {
      try {
        const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(item.source)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const blob = await response.blob();
          const previewUrl = URL.createObjectURL(blob);
          // Update the queue item with the preview
          setQueue(q => q.map(i =>
            i.id === item.id ? { ...i, previewUrl } : i
          ));
        }
      } catch (error) {
        console.error('[handleUrlsImport] Failed to fetch preview for:', item.source, error);
      }
    }
  }, []);

  // Start editing the first item in queue
  const startEditingQueue = useCallback(async () => {
    if (queue.length === 0) return;

    const firstItem = queue[0];
    setCurrentQueueIndex(0);

    if (firstItem.type === 'file') {
      handleFileSelect(firstItem.source);
    } else {
      // URL - fetch via proxy
      await handleUrlImport(firstItem.source);
    }
  }, [queue, handleFileSelect, handleUrlImport]);

  // Move to next item in queue (current one will upload in background)
  const handleNextInQueue = useCallback(async () => {
    // Store finalName in queue item before upload
    setQueue(q => q.map((item, i) =>
      i === currentQueueIndex ? { ...item, status: 'uploading', finalName: metadata.filename } : item
    ));

    // Find next pending item
    const nextIndex = queue.findIndex((item, i) =>
      i > currentQueueIndex && item.status === 'pending'
    );

    if (nextIndex >= 0) {
      setCurrentQueueIndex(nextIndex);
      const nextItem = queue[nextIndex];

      if (nextItem.type === 'file') {
        handleFileSelect(nextItem.source);
      } else {
        await handleUrlImport(nextItem.source);
      }
      // Alt text will be empty for subsequent images (user requested)
    } else {
      // No more items - back to queue view
      setCurrentQueueIndex(-1);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [queue, currentQueueIndex, handleFileSelect, handleUrlImport, previewUrl]);

  // Skip current item without uploading
  const handleSkipInQueue = useCallback(async () => {
    setQueue(q => q.map((item, i) =>
      i === currentQueueIndex ? { ...item, status: 'skipped' } : item
    ));

    // Find next pending item
    const nextIndex = queue.findIndex((item, i) =>
      i > currentQueueIndex && item.status === 'pending'
    );

    if (nextIndex >= 0) {
      setCurrentQueueIndex(nextIndex);
      const nextItem = queue[nextIndex];

      if (nextItem.type === 'file') {
        handleFileSelect(nextItem.source);
      } else {
        await handleUrlImport(nextItem.source);
      }
    } else {
      // No more items
      setCurrentQueueIndex(-1);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [queue, currentQueueIndex, handleFileSelect, handleUrlImport, previewUrl]);

  // Remove item from queue
  const removeFromQueue = useCallback((id) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  // Retry a failed upload - reset to pending and start editing
  const retryQueueItem = useCallback(async (id) => {
    const itemIndex = queue.findIndex(i => i.id === id);
    if (itemIndex < 0) return;

    const item = queue[itemIndex];

    // Reset to pending status
    setQueue(q => q.map((i, idx) =>
      idx === itemIndex ? { ...i, status: 'pending', error: undefined } : i
    ));

    // Start editing this item
    setCurrentQueueIndex(itemIndex);

    if (item.type === 'file') {
      handleFileSelect(item.source);
    } else {
      await handleUrlImport(item.source);
    }
  }, [queue, handleFileSelect, handleUrlImport]);

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

  // Handle upload in background (for queue mode)
  // Data is passed as params to avoid stale state when navigating to next item
  const handleUploadInBackground = useCallback(async (queueIndex, uploadData) => {
    const { file, cropArea, outputFormat, meta, focal, aspectRatio, itemName } = uploadData;

    if (!file) return;

    // Mark as uploading
    setQueue(q => q.map((item, i) =>
      i === queueIndex ? { ...item, status: 'uploading' } : item
    ));

    try {
      const result = await uploadWithVariants({
        file,
        cropArea,
        format: outputFormat,
        metadata: {
          name: meta.filename,
          altText: meta.altText,
          caption: meta.caption,
          credit: meta.credit,
          focalPoint: focal,
          aspectRatio,
        },
      });

      if (result?.aborted) {
        // Mark as error in queue
        setQueue(q => q.map((item, i) =>
          i === queueIndex ? { ...item, status: 'error', error: 'Upload cancelled' } : item
        ));
        toast.error(`${itemName} - Upload cancelled`);
        return;
      }

      if (result.success) {
        // Mark as done in queue - preserve finalName from captured data
        setQueue(q => q.map((item, i) =>
          i === queueIndex ? { ...item, status: 'done', result: result.data, finalName: itemName } : item
        ));
        toast.success(`${itemName} uploaded ✅`);
        onUploadComplete?.(result.data);
      } else {
        // Mark as error
        setQueue(q => q.map((item, i) =>
          i === queueIndex ? { ...item, status: 'error', error: 'Upload failed' } : item
        ));
        toast.error(`${itemName} failed ❌`);
      }
    } catch (err) {
      console.error('Background upload failed:', err);
      setQueue(q => q.map((item, i) =>
        i === queueIndex ? { ...item, status: 'error', error: err.message } : item
      ));
      toast.error(`${itemName} - ${err.message}`);
    }
  }, [uploadWithVariants, onUploadComplete]);

  // Handle cancel/back
  const handleBack = useCallback(() => {
    abortUpload();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setFocalPoint({ x: 50, y: 50 });
    // Reset to queue view so user can add more images
    setCurrentQueueIndex(-1);
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
        className="!max-w-6xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl !top-[5vh] !translate-y-0"
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
            {/* Queue Navigation Buttons */}
            {allowMultiple && currentQueueIndex >= 0 && selectedFile && !isUploading && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipInQueue}
                  className="h-8 px-3"
                >
                  Skip
                </Button>
                <Button
                  onClick={async () => {
                    // Capture current state BEFORE navigation changes it
                    const capturedData = {
                      file: selectedFile,
                      cropArea: croppedAreaPixels,
                      outputFormat: format,
                      meta: { ...metadata },
                      focal: { ...focalPoint },
                      aspectRatio: aspect,
                      itemName: metadata.filename || queue[currentQueueIndex]?.name,
                    };
                    const capturedIndex = currentQueueIndex;

                    // Move to next item FIRST (changes state)
                    await handleNextInQueue();

                    // Then start background upload with captured data (non-blocking)
                    handleUploadInBackground(capturedIndex, capturedData);
                  }}
                  disabled={!canUpload}
                  size="sm"
                  className="h-8 px-4 gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload & Next
                </Button>
              </>
            )}
            {/* Standard Upload Button (non-queue mode) */}
            {(!allowMultiple || currentQueueIndex < 0) && selectedFile && !isUploading && (
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
            {/* Step 1: File Selection or Queue View */}
            {!selectedFile && !isUploading && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 overflow-y-auto"
              >
                {/* Show Queue if we have items and not editing */}
                {allowMultiple && queue.length > 0 && currentQueueIndex === -1 ? (
                  <div className="space-y-4">
                    {/* DropZone FIRST - Add More Images */}
                    <DropZone
                      onFileSelect={handleFileSelect}
                      onFilesSelect={handleFilesSelect}
                      onUrlImport={handleUrlImport}
                      onUrlsImport={handleUrlsImport}
                      allowMultiple={allowMultiple}
                    />

                    {/* Queue Header and List SECOND */}
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">
                          Queue ({queue.length} images)
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQueue([])}
                          >
                            Clear All
                          </Button>
                          <Button
                            size="sm"
                            onClick={startEditingQueue}
                            disabled={queue.filter(q => q.status === 'pending').length === 0}
                          >
                            Start Editing →
                          </Button>
                        </div>
                      </div>

                      {/* Queue List */}
                      <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                        <AnimatePresence initial={false}>
                          {queue.map((item, index) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, x: -20, scale: 0.95 }}
                              transition={{
                                duration: 0.2,
                                delay: index * 0.03,
                                ease: 'easeOut'
                              }}
                              layout
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border",
                                item.status === 'done' && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
                                item.status === 'uploading' && "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
                                item.status === 'error' && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
                                item.status === 'skipped' && "bg-gray-50 border-gray-200 opacity-50 dark:bg-gray-900/30",
                                item.status === 'pending' && "bg-background border-border"
                              )}
                            >
                              {/* Thumbnail */}
                              <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                                {item.previewUrl ? (
                                  <img
                                    src={item.previewUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Link className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              {/* Name & Status */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.finalName || item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.type === 'url' ? 'URL Import' : 'File'}
                                </p>
                              </div>

                              {/* Status Badge */}
                              <Badge
                                variant={
                                  item.status === 'done' ? 'default' :
                                    item.status === 'uploading' ? 'secondary' :
                                      item.status === 'error' ? 'destructive' :
                                        item.status === 'skipped' ? 'outline' : 'outline'
                                }
                              >
                                {item.status === 'pending' && '⏳ Pending'}
                                {item.status === 'uploading' && '🔄 Uploading'}
                                {item.status === 'done' && '✅ Done'}
                                {item.status === 'error' && '❌ Error'}
                                {item.status === 'skipped' && '⏭️ Skipped'}
                              </Badge>

                              {/* Retry Button (for error items) */}
                              {item.status === 'error' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs"
                                  onClick={() => retryQueueItem(item.id)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Retry
                                </Button>
                              )}

                              {/* Remove Button (for pending and error items) */}
                              {(item.status === 'pending' || item.status === 'error') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeFromQueue(item.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DropZone
                    onFileSelect={handleFileSelect}
                    onFilesSelect={handleFilesSelect}
                    onUrlImport={handleUrlImport}
                    onUrlsImport={handleUrlsImport}
                    allowMultiple={allowMultiple}
                  />
                )}
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

        {/* Background Upload Progress - Fixed Footer Position */}
        <AnimatePresence>
          {showProgressBar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut'
              }}
              className="shrink-0 border-t bg-muted/30"
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {queue.some(q => q.status === 'uploading')
                      ? `Uploading: ${queue.find(q => q.status === 'uploading')?.finalName || queue.find(q => q.status === 'uploading')?.name}`
                      : '✅ Upload complete!'
                    }
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {queue.some(q => q.status === 'uploading') ? `${progress?.overall || 0}%` : '100%'}
                  </span>
                </div>
                <VariantProgress progress={queue.some(q => q.status === 'uploading') ? progress : { overall: 100, generating: 100, uploading: 100, finalizing: 100 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
