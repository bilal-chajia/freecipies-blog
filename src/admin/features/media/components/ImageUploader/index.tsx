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
import { X, ArrowLeft, Upload } from 'lucide-react';
import { authorsAPI } from '@admin/services/api';
import { useImageUploadSettings } from '@admin/hooks/useImageUploadSettings';
import { toast } from 'sonner';

import type { UploadProgress } from './types';

const AUTHORS_CACHE_KEY = 'media_credit_authors';
const AUTHORS_CACHE_TTL = 24 * 60 * 60 * 1000;

interface AuthorRecord {
  id: number | string;
  name: string;
  slug: string;
  imagesJson?: unknown;
  images_json?: unknown;
  mediaCredit?: { type: string } | null;
}

interface CreditSnapshot {
  type: string;
  id: number;
  name: string;
  slug: string;
  avatar?: Record<string, unknown>;
}

function readCachedAuthors(): AuthorRecord[] {
  try {
    const raw = localStorage.getItem(AUTHORS_CACHE_KEY);
    if (!raw) return [];
    const cached = JSON.parse(raw);
    if (!cached?.timestamp || Date.now() - cached.timestamp > AUTHORS_CACHE_TTL) return [];
    return Array.isArray(cached.data) ? cached.data : [];
  } catch {
    return [];
  }
}

function writeCachedAuthors(authors: AuthorRecord[]) {
  try {
    localStorage.setItem(AUTHORS_CACHE_KEY, JSON.stringify({
      data: authors,
      timestamp: Date.now(),
    }));
  } catch {
    // Cache is an optimization only.
  }
}

function parseImagesJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value as string);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildAuthorCreditSnapshot(author: AuthorRecord | undefined): CreditSnapshot | null {
  if (!author?.id || !author?.name || !author?.slug) return null;

  if (author.mediaCredit?.type === 'author') {
    return author.mediaCredit as CreditSnapshot;
  }

  const credit: CreditSnapshot = {
    type: 'author',
    id: Number(author.id),
    name: author.name,
    slug: author.slug,
  };

  const images = parseImagesJson(author.imagesJson ?? author.images_json);
  const avatar = images.avatar as Record<string, unknown> | undefined;
  const xs = (avatar?.variants as Record<string, unknown> | undefined)?.xs as Record<string, unknown> | undefined;
  const sm = (avatar?.variants as Record<string, unknown> | undefined)?.sm as Record<string, unknown> | undefined;

  if (xs?.url && sm?.url) {
    credit.avatar = {
      ...(avatar?.media_id ? { media_id: Number(avatar.media_id) } : {}),
      ...(avatar?.alt ? { alt: avatar.alt } : {}),
      variants: {
        xs: {
          url: xs.url,
          width: Number(xs.width),
          height: Number(xs.height),
          ...(typeof xs.size_bytes === 'number' ? { size_bytes: xs.size_bytes } : {}),
        },
        sm: {
          url: sm.url,
          width: Number(sm.width),
          height: Number(sm.height),
          ...(typeof sm.size_bytes === 'number' ? { size_bytes: sm.size_bytes } : {}),
        },
      },
    };
  }

  return credit;
}

interface QueueItem {
  type: 'file' | 'url';
  source: File | string;
  status: string;
  name: string;
  finalName?: string;
}

interface ImageUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (data: unknown) => void;
  defaultFormat?: string;
  variantSizes?: Record<string, number>;
  allowMultiple?: boolean;
}

export default function ImageUploader({
  open,
  onOpenChange,
  onUploadComplete,
  defaultFormat = 'webp',
  variantSizes,
  allowMultiple = false,
}: ImageUploaderProps) {
  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    resetCurrentIndex,
  } = useUploadQueue();

  // Progress bar visibility with delayed hide
  const [showProgressBar, setShowProgressBar] = useState(false);
  const progressBarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState('free');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Record<string, number> | null>(null);

  // Focal Point state
  const [focalPoint, setFocalPoint] = useState({ x: 50, y: 50 });
  const [showFocalPoint, setShowFocalPoint] = useState(false);

  // Metadata state
  const [format, setFormat] = useState(defaultFormat);
  const [metadata, setMetadata] = useState({
    filename: '',
    altText: '',
    caption: '',
    creditAuthorId: '',
  });

  const { settings } = useImageUploadSettings();

  const { uploadWithVariants, progress, error, abortUpload } = useImageUpload({
    variantSizes,
  });

  // Authors for credit selection
  const [authors, setAuthors] = useState<AuthorRecord[]>([]);
  const [loadingAuthors, setLoadingAuthors] = useState(false);

  const selectedCredit = useMemo(() => {
    const author = authors.find((item) => String(item.id) === String(metadata.creditAuthorId));
    return buildAuthorCreditSnapshot(author);
  }, [authors, metadata.creditAuthorId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setPreviewUrl('');
      setIsUploading(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setAspect(settings?.default_aspect_ratio || 'free');
      setCroppedAreaPixels(null);
      setFocalPoint({ x: 50, y: 50 });
      setShowFocalPoint(false);
      setFormat(settings?.encoding?.format || defaultFormat);
      setMetadata({
        filename: '',
        altText: '',
        caption: '',
        creditAuthorId: settings?.default_credit?.id
          ? String(settings.default_credit.id)
          : ''
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
      const cachedAuthors = readCachedAuthors();
      if (cachedAuthors.length) {
        setAuthors(cachedAuthors);
      }
      setLoadingAuthors(true);
      authorsAPI.getAll()
        .then(response => {
          const data = response.data?.data || response.data || [];
          const nextAuthors = Array.isArray(data) ? data : [];
          setAuthors(nextAuthors);
          writeCachedAuthors(nextAuthors);
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
  const handleFileSelect = useCallback((file: File) => {
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
      creditAuthorId: settings?.default_credit?.id
        ? String(settings.default_credit.id)
        : '',
    });

    // Reset crop/zoom/rotation for new image
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFocalPoint({ x: 50, y: 50 });
  }, [previewUrl, settings]);

  // Handle URL import - fetch via proxy to avoid CORS, then load into cropper
  const handleUrlImport = useCallback(async (url: string) => {
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

    } catch (err: unknown) {
      console.error('URL import failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Import failed: ${message}`);
    }
  }, [handleFileSelect]);

  // Start editing the first item in queue
  const startEditingQueue = useCallback(async () => {
    if (queue.length === 0) return;
    startQueue();

    const firstItem = queue[0];
    if (firstItem.type === 'file') {
      handleFileSelect(firstItem.source as File);
    } else {
      // URL - fetch via proxy
      await handleUrlImport(firstItem.source as string);
    }
  }, [queue, startQueue, handleFileSelect, handleUrlImport]);

  // Move to next item in queue (current one will upload in background)
  const handleNextInQueue = useCallback(async () => {
    // Store finalName in queue item before upload
    setItemFinalName(currentQueueIndex, metadata.filename);
    
    // Find next pending item BEFORE calling nextInQueue (to know what to load)
    const nextIndex = queue.findIndex((item: QueueItem, i: number) =>
      i > currentQueueIndex && item.status === 'pending'
    );
    
    nextInQueue();

    // Load next item if available
    if (nextIndex >= 0) {
      const nextItem = queue[nextIndex];
      if (nextItem.type === 'file') {
        handleFileSelect(nextItem.source as File);
      } else {
        await handleUrlImport(nextItem.source as string);
      }
    } else {
      // No more items - back to queue view
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [currentQueueIndex, queue, metadata.filename, setItemFinalName, nextInQueue, handleFileSelect, handleUrlImport, previewUrl]);

  // Skip current item without uploading
  const handleSkipInQueue = useCallback(async () => {
    // Find next pending item BEFORE calling skipInQueue
    const nextIndex = queue.findIndex((item: QueueItem, i: number) =>
      i > currentQueueIndex && item.status === 'pending'
    );
    
    skipInQueue();

    // Load next item if available
    if (nextIndex >= 0) {
      const nextItem = queue[nextIndex];
      if (nextItem.type === 'file') {
        handleFileSelect(nextItem.source as File);
      } else {
        await handleUrlImport(nextItem.source as string);
      }
    } else {
      // No more items
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [currentQueueIndex, queue, skipInQueue, handleFileSelect, handleUrlImport, previewUrl]);

  // Handle crop complete
  const onCropComplete = useCallback((_croppedArea: unknown, croppedAreaPixels: Record<string, number>) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFocalPointClick = useCallback((point: { x: number; y: number }) => {
    setFocalPoint(point);
  }, []);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    if (!selectedCredit) {
      toast.error('Select an author credit before uploading');
      return;
    }

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
          credit: selectedCredit,
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
  }, [selectedFile, croppedAreaPixels, metadata, selectedCredit, format, aspect, focalPoint, uploadWithVariants, onUploadComplete, onOpenChange]);

  // Handle upload in background (for queue mode)
  // Data is passed as params to avoid stale state when navigating to next item
  const handleUploadInBackground = useCallback(async (queueIndex: number, uploadData: Record<string, unknown>) => {
    const { file, cropArea, outputFormat, meta, focal, aspectRatio, itemName } = uploadData as {
      file: File;
      cropArea: Record<string, number> | null;
      outputFormat: string;
      meta: Record<string, string>;
      focal: { x: number; y: number };
      aspectRatio: string;
      itemName: string;
    };

    if (!file) return;
    const queuedCredit = buildAuthorCreditSnapshot(authors.find((item) => String(item.id) === String(meta.creditAuthorId)));
    if (!queuedCredit) {
      markItemError(queueIndex, 'Select an author credit before uploading');
      toast.error(`${itemName} - Select an author credit before uploading`);
      return;
    }

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
          credit: queuedCredit,
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
    } catch (err: unknown) {
      console.error('Background upload failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      markItemError(queueIndex, message);
      toast.error(`${itemName} - ${message}`);
    }
  }, [authors, markItemUploading, markItemDone, markItemError, uploadWithVariants, onUploadComplete]);

  // Handle cancel/back
  const handleBack = useCallback(() => {
    abortUpload();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setFocalPoint({ x: 50, y: 50 });
    resetCurrentIndex();
  }, [abortUpload, previewUrl, resetCurrentIndex]);

  // Handle close
  const handleClose = useCallback(() => {
    abortUpload();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    onOpenChange(false);
  }, [abortUpload, previewUrl, onOpenChange]);

  const handleDialogChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
    } else {
      handleClose();
    }
  }, [handleClose, onOpenChange]);

  const numericAspect = useMemo(() => ASPECT_RATIOS[aspect], [aspect]);
  const canUpload = useMemo(() =>
    selectedFile && metadata.filename.trim() && metadata.altText.trim() && selectedCredit,
    [selectedFile, metadata.filename, metadata.altText, selectedCredit]
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className="!max-w-6xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl !top-[5vh] !translate-y-0"
        showCloseButton={false}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            {selectedFile && !isUploading && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 rounded-full">
                <ArrowLeft className="size-4" />
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
                  <Upload className="size-3.5" />
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
                <Upload className="size-3.5" />
                Upload
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleClose}>
                <X className="size-4" />
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
                    maxFileSizeMB={settings?.max_file_size_mb}
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
