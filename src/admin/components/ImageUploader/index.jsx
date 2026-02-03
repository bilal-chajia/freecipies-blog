/**
 * ImageUploader - Single-step image upload with integrated crop and metadata
 * 
 * Design: 60/40 layout (image | form) with all controls on right panel
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DropZone from './DropZone';
import UploadQueue from './components/UploadQueue';
import CropPanel from './components/CropPanel';
import MetadataPanel from './components/MetadataPanel';
import ProgressPanel from './components/ProgressPanel';
import VariantProgress from './VariantProgress';
import { useImageUpload } from './hooks/useImageUpload';
import { useUploadQueue } from './hooks/useUploadQueue';
import { ASPECT_RATIOS } from './config';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/ui/dialog';
import { Button } from '@/ui/button';
import { X, ArrowLeft, Upload, RefreshCw } from 'lucide-react';
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
  const {
    queue,
    currentIndex: currentQueueIndex,
    currentItem,
    pendingCount,
    addFiles: addFilesToQueue,
    addUrls: addUrlsToQueue,
    removeItem: removeFromQueue,
    clearQueue,
    startQueue,
    nextItem: nextInQueue,
    skipItem: skipInQueue,
    markItemUploading,
    markItemDone,
    markItemError,
    retryItem: retryQueueItem,
    setItemFinalName,
  } = useUploadQueue();

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
      clearQueue();
    }
  }, [open, defaultFormat, settings, clearQueue]);

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

  // Start editing the first item in queue
  const startEditingQueue = useCallback(async () => {
    if (queue.length === 0) return;
    startQueue();

    const firstItem = queue[0];
    if (firstItem.type === 'file') {
      handleFileSelect(firstItem.source);
    } else {
      // URL - fetch via proxy
      await handleUrlImport(firstItem.source);
    }
  }, [queue, startQueue, handleFileSelect, handleUrlImport]);

  // Move to next item in queue (current one will upload in background)
  const handleNextInQueue = useCallback(async () => {
    // Store finalName in queue item before upload
    setItemFinalName(currentQueueIndex, metadata.filename);
    nextInQueue();

    // Load next item if available
    if (currentItem) {
      if (currentItem.type === 'file') {
        handleFileSelect(currentItem.source);
      } else {
        await handleUrlImport(currentItem.source);
      }
    } else {
      // No more items - back to queue view
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [currentQueueIndex, currentItem, metadata.filename, nextInQueue, handleFileSelect, handleUrlImport, previewUrl]);

  // Skip current item without uploading
  const handleSkipInQueue = useCallback(async () => {
    skipInQueue();

    // Load next item if available
    if (currentItem) {
      if (currentItem.type === 'file') {
        handleFileSelect(currentItem.source);
      } else {
        await handleUrlImport(currentItem.source);
      }
    } else {
      // No more items
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [skipInQueue, currentItem, handleFileSelect, handleUrlImport, previewUrl]);

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFocalPointClick = useCallback((point) => {
    setFocalPoint(point);
  }, []);

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
    markItemUploading(queueIndex);

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
        markItemError(queueIndex, 'Upload cancelled');
        toast.error(`${itemName} - Upload cancelled`);
        return;
      }

      if (result.success) {
        // Mark as done in queue
        markItemDone(queueIndex, result.data);
        toast.success(`${itemName} uploaded ✅`);
        onUploadComplete?.(result.data);
      } else {
        // Mark as error
        markItemError(queueIndex, 'Upload failed');
        toast.error(`${itemName} failed ❌`);
      }
    } catch (err) {
      console.error('Background upload failed:', err);
      markItemError(queueIndex, err.message);
      toast.error(`${itemName} - ${err.message}`);
    }
  }, [markItemUploading, markItemDone, markItemError, uploadWithVariants, onUploadComplete]);

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

  const numericAspect = useMemo(() => ASPECT_RATIOS[aspect], [aspect]);
  const canUpload = useMemo(() => 
    selectedFile && metadata.filename.trim() && metadata.altText.trim(),
    [selectedFile, metadata.filename, metadata.altText]
  );

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
                  <UploadQueue
                    queue={queue}
                    onClear={clearQueue}
                    onStart={startEditingQueue}
                    onRemove={removeFromQueue}
                    onRetry={retryQueueItem}
                    dropZoneProps={{
                      onFileSelect: handleFileSelect,
                      onFilesSelect: addFilesToQueue,
                      onUrlImport: handleUrlImport,
                      onUrlsImport: addUrlsToQueue,
                      allowMultiple,
                    }}
                  />
                ) : (
                  <DropZone
                    onFileSelect={handleFileSelect}
                    onFilesSelect={addFilesToQueue}
                    onUrlImport={handleUrlImport}
                    onUrlsImport={addUrlsToQueue}
                    allowMultiple={allowMultiple}
                    maxFileSizeMB={settings?.maxFileSizeMB}
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
                <CropPanel
                  previewUrl={previewUrl}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={numericAspect}
                  focalPoint={focalPoint}
                  showFocalPoint={showFocalPoint}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                  onFocalPointClick={handleFocalPointClick}
                />

                {/* Right: Form Panel */}
                <MetadataPanel
                  metadata={metadata}
                  onMetadataChange={setMetadata}
                  format={format}
                  onFormatChange={setFormat}
                  aspect={aspect}
                  onAspectChange={setAspect}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  rotation={rotation}
                  onRotationChange={setRotation}
                  focalPoint={focalPoint}
                  showFocalPoint={showFocalPoint}
                  onToggleFocalPoint={() => setShowFocalPoint(!showFocalPoint)}
                  authors={authors}
                  loadingAuthors={loadingAuthors}
                />
              </motion.div>
            )}

            {/* Step 3: Uploading */}
            {isUploading && <ProgressPanel progress={progress} error={error} />}
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
