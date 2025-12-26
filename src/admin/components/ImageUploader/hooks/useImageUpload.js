/**
 * useImageUpload - Hook for uploading images with client-side variant generation
 * 
 * Features:
 * - Parallel variant uploads (3x faster)
 * - Automatic retry with exponential backoff
 * - Memory management and cleanup
 * - Centralized configuration
 * 
 * Flow:
 * 1. User selects image
 * 2. Client generates variants (original crop, lg, md, sm, xs in WebP/AVIF)
 * 3. Upload variants in parallel
 * 4. Confirm upload to create D1 record
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { mediaAPI } from '@admin/services/api';
import { withRetry, isRetryableError } from '@admin/utils/retry';
import { 
  VARIANT_SIZES, 
  ENCODING_QUALITY, 
  PLACEHOLDER_CONFIG,
  UPLOAD_CONFIG,
  CANVAS_CONFIG,
  FILE_CONSTRAINTS,
} from '../config';
import { 
  UploadError, 
  ERROR_TYPES, 
  fromError, 
  validateFile 
} from '../errors';
import { useImageUploadSettings } from '@admin/hooks/useImageUploadSettings';

const createAbortError = () => {
  try {
    return new DOMException('Aborted', 'AbortError');
  } catch {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
  }
};

const isAbortError = (error) => {
  return (
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CANCELED' ||
    /aborted|canceled|cancelled/i.test(error?.message || '')
  );
};

const yieldToMain = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => resolve());
  } else {
    setTimeout(resolve, 0);
  }
});

export function useImageUpload() {
  const [progress, setProgress] = useState({
    overall: 0,
    generating: 0,
    uploading: 0,
    finalizing: 0,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const workerRef = useRef(null);
  const workerRequestsRef = useRef(new Map());
  const workerIdRef = useRef(0);
  
  // Use dynamic settings
  const { settings, isLoading: isSettingsLoading } = useImageUploadSettings();
  
  // Helper to get config (defaulting to static config if settings not yet loaded)
  const getConfig = useCallback(() => {
    if (isSettingsLoading || !settings) {
      return {
        variantSizes: VARIANT_SIZES,
        encodingQuality: ENCODING_QUALITY,
        maxSizeBytes: FILE_CONSTRAINTS.maxSizeBytes,
      };
    }
    return {
      variantSizes: {
        lg: settings.variantLg,
        md: settings.variantMd,
        sm: settings.variantSm,
        xs: settings.variantXs,
      },
      encodingQuality: {
        ...ENCODING_QUALITY,
        webp: settings.webpQuality,
        avif: settings.avifQuality,
      },
      maxSizeBytes: settings.maxFileSizeMB * 1024 * 1024,
    };
  }, [settings, isSettingsLoading]);

  const getEncoderWorker = useCallback(() => {
    if (typeof Worker === 'undefined') {
      return null;
    }

    if (workerRef.current) {
      return workerRef.current;
    }

    const worker = new Worker(
      new URL('../workers/encoder.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const { id, success, blob, outputFormat, error: workerError } = event.data || {};
      if (!id) return;
      const entry = workerRequestsRef.current.get(id);
      if (!entry) return;

      workerRequestsRef.current.delete(id);

      if (entry.signal && entry.onAbort) {
        entry.signal.removeEventListener('abort', entry.onAbort);
      }

      if (entry.aborted) {
        return;
      }

      if (success) {
        entry.resolve({ blob, outputFormat });
      } else {
        entry.reject(new Error(workerError || 'Worker encoding failed'));
      }
    };

    worker.onerror = (event) => {
      const error = event?.error || new Error('Worker error');
      const entries = Array.from(workerRequestsRef.current.values());
      workerRequestsRef.current.clear();
      entries.forEach((entry) => {
        if (entry.signal && entry.onAbort) {
          entry.signal.removeEventListener('abort', entry.onAbort);
        }
        entry.reject(error);
      });
    };

    workerRef.current = worker;
    return worker;
  }, []);
  


  // Track resources for cleanup
  const objectUrlsRef = useRef([]);
  const canvasesRef = useRef([]);

  /**
   * Cleanup tracked resources (memory management)
   */
  const cleanupResources = useCallback(() => {
    // Revoke object URLs
    objectUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    objectUrlsRef.current = [];

    // Clear canvas contexts
    canvasesRef.current.forEach(canvas => {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.width = 1;
        canvas.height = 1;
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    canvasesRef.current = [];
  }, []);

  const abortUpload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanupResources();
  }, [cleanupResources]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      const pending = Array.from(workerRequestsRef.current.values());
      workerRequestsRef.current.clear();
      pending.forEach((entry) => {
        if (entry.signal && entry.onAbort) {
          entry.signal.removeEventListener('abort', entry.onAbort);
        }
        entry.reject(createAbortError());
      });
      cleanupResources();
    };
  }, [cleanupResources]);

  /**
   * Track an object URL for cleanup
   */
  const trackObjectUrl = useCallback((url) => {
    objectUrlsRef.current.push(url);
    return url;
  }, []);

  /**
   * Create optimized canvas with hardware acceleration hints
   */
  const createOptimizedCanvas = useCallback((width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvasesRef.current.push(canvas);
    return canvas;
  }, []);

  /**
   * Get optimized 2D context
   */
  const getOptimizedContext = useCallback((canvas) => {
    return canvas.getContext('2d', {
      alpha: CANVAS_CONFIG.alpha,
      desynchronized: CANVAS_CONFIG.desynchronized,
    });
  }, []);

  /**
   * Apply crop to an image and return the cropped canvas
   */
  const applyCrop = useCallback(async (file, cropArea, signal) => {
    if (signal?.aborted) {
      throw createAbortError();
    }

    if (typeof createImageBitmap === 'function') {
      let imageBitmap = null;
      try {
        imageBitmap = await createImageBitmap(file);
      } catch (err) {
        imageBitmap = null;
      }

      if (imageBitmap) {
        if (signal?.aborted) {
          imageBitmap.close();
          throw createAbortError();
        }

        let canvas;
        let ctx;

        if (cropArea) {
          canvas = createOptimizedCanvas(cropArea.width, cropArea.height);
          ctx = getOptimizedContext(canvas);
          if (!ctx) {
            imageBitmap.close();
            throw new Error('Canvas context not available');
          }
          ctx.drawImage(
            imageBitmap,
            cropArea.x, cropArea.y,
            cropArea.width, cropArea.height,
            0, 0,
            cropArea.width, cropArea.height
          );
        } else {
          canvas = createOptimizedCanvas(imageBitmap.width, imageBitmap.height);
          ctx = getOptimizedContext(canvas);
          if (!ctx) {
            imageBitmap.close();
            throw new Error('Canvas context not available');
          }
          ctx.drawImage(imageBitmap, 0, 0);
        }

        imageBitmap.close();
        return { canvas, width: canvas.width, height: canvas.height };
      }
    }

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      const img = new Image();
      const objectUrl = trackObjectUrl(URL.createObjectURL(file));

      const cleanup = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignore cleanup errors
        }
      };

      const onAbort = () => {
        cleanup();
        reject(createAbortError());
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      img.onload = () => {
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }

        let canvas;
        let ctx;

        if (cropArea) {
          canvas = createOptimizedCanvas(cropArea.width, cropArea.height);
          ctx = getOptimizedContext(canvas);
          if (!ctx) {
            cleanup();
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(
            img,
            cropArea.x, cropArea.y,
            cropArea.width, cropArea.height,
            0, 0,
            cropArea.width, cropArea.height
          );
        } else {
          canvas = createOptimizedCanvas(img.width, img.height);
          ctx = getOptimizedContext(canvas);
          if (!ctx) {
            cleanup();
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0);
        }

        cleanup();
        resolve({ canvas, width: canvas.width, height: canvas.height });
      };
      img.onerror = () => {
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
        cleanup();
        reject(new Error('Failed to load image'));
      };
      img.src = objectUrl;
    });
  }, [trackObjectUrl, createOptimizedCanvas, getOptimizedContext]);

  /**
   * Resize canvas to target width (maintains aspect ratio)
   */
  const resizeCanvas = useCallback((sourceCanvas, targetWidth) => {
    const ratio = sourceCanvas.width / sourceCanvas.height;
    const width = Math.min(targetWidth, sourceCanvas.width);
    const height = Math.round(width / ratio);

    const canvas = createOptimizedCanvas(width, height);
    const ctx = getOptimizedContext(canvas);
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = CANVAS_CONFIG.imageSmoothingQuality;
    ctx.drawImage(sourceCanvas, 0, 0, width, height);

    return { canvas, width, height };
  }, [createOptimizedCanvas, getOptimizedContext]);

  const encodeImageDataWithWorker = useCallback(async (imageData, format, quality, signal) => {
    const worker = getEncoderWorker();
    if (!worker) {
      throw new Error('Worker not available');
    }

    if (signal?.aborted) {
      throw createAbortError();
    }

    const id = ++workerIdRef.current;

    return new Promise((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        signal: null,
        onAbort: null,
        aborted: false,
      };

      if (signal) {
        if (signal.aborted) {
          reject(createAbortError());
          return;
        }

        entry.signal = signal;
        entry.onAbort = () => {
          entry.aborted = true;
          workerRequestsRef.current.delete(id);
          reject(createAbortError());
        };
        signal.addEventListener('abort', entry.onAbort, { once: true });
      }

      workerRequestsRef.current.set(id, entry);

      const buffer = imageData.data.buffer;
      worker.postMessage({
        id,
        payload: {
          buffer,
          width: imageData.width,
          height: imageData.height,
          format,
          quality,
        },
      }, [buffer]);
    });
  }, [getEncoderWorker]);

  /**
   * Encode canvas to WebP/AVIF using jSquash or Canvas fallback
   */
  const encodeCanvas = useCallback(async (canvas, format, quality, signal) => {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Default fallback qualities if not provided
    const q = quality || (format === 'avif' ? ENCODING_QUALITY.avif : ENCODING_QUALITY.webp);

    let imageData = null;

    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
      throw new Error('Failed to read image data');
    }

    if (getEncoderWorker()) {
      try {
        return await encodeImageDataWithWorker(imageData, format, q, signal);
      } catch (err) {
        if (isAbortError(err)) {
          throw err;
        }
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    }

    const encodeWebp = async () => {
      try {
        const { encode } = await import('@jsquash/webp');
        const buffer = await encode(imageData, { quality: q });
        return { blob: new Blob([buffer], { type: 'image/webp' }), outputFormat: 'webp' };
      } catch (err) {
        return new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => blob ? resolve({ blob, outputFormat: 'webp' }) : reject(new Error('Canvas encoding failed')),
            'image/webp',
            q / 100
          );
        });
      }
    };

    if (format === 'avif') {
      try {
        const { encode } = await import('@jsquash/avif');
        const buffer = await encode(imageData, { quality: q });
        return { blob: new Blob([buffer], { type: 'image/avif' }), outputFormat: 'avif' };
      } catch (err) {
        console.warn('AVIF encoding failed, falling back to WebP:', err.message);
        return encodeWebp();
      }
    }

    return encodeWebp();
  }, [encodeImageDataWithWorker, getEncoderWorker]);

  /**
   * Generate placeholder LQIP (20px wide base64)
   */
  const generatePlaceholder = useCallback(async (canvas) => {
    const ratio = canvas.width / canvas.height;
    const placeholderHeight = Math.round(PLACEHOLDER_CONFIG.width / ratio);

    const placeholderCanvas = createOptimizedCanvas(PLACEHOLDER_CONFIG.width, placeholderHeight);
    const ctx = getOptimizedContext(placeholderCanvas);
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    ctx.drawImage(canvas, 0, 0, PLACEHOLDER_CONFIG.width, placeholderHeight);

    return placeholderCanvas.toDataURL(PLACEHOLDER_CONFIG.format, PLACEHOLDER_CONFIG.quality);
  }, [createOptimizedCanvas, getOptimizedContext]);

  /**
   * Get original file extension
   */
  const getFileExtension = useCallback((file) => {
    const name = file.name || 'image.jpg';
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : 'jpg';
  }, []);

  /**
   * Upload a single variant with retry
   */
  const uploadVariantWithRetry = useCallback(async (blob, options, signal) => {
    return withRetry(
      () => mediaAPI.uploadVariant(blob, options, { signal }),
      {
        maxRetries: UPLOAD_CONFIG.retryAttempts,
        baseDelay: UPLOAD_CONFIG.retryBaseDelayMs,
        shouldRetry: (err, attempt) => !isAbortError(err) && isRetryableError(err, attempt),
      }
    );
  }, []);

  /**
   * Upload variants in parallel with concurrency limit
   */
  const uploadVariantsInParallel = useCallback(async (
    variantNames,
    variantBlobs,
    variants,
    cleanBaseName,
    uploadId,
    format,
    originalExt,
    fileType,
    signal
  ) => {
    const uploadedVariants = {};
    const totalVariants = variantNames.length;
    const maxConcurrent = UPLOAD_CONFIG.maxConcurrentUploads;

    // Process in batches
    for (let i = 0; i < variantNames.length; i += maxConcurrent) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      const batch = variantNames.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (name) => {
        if (signal?.aborted) {
          throw createAbortError();
        }
        const blob = variantBlobs[name];
        const variantInfo = variants[name];

        const contentType = name === 'original'
          ? (fileType || 'image/jpeg')
          : (format === 'avif' ? 'image/avif' : 'image/webp');

        const ext = name === 'original' ? originalExt : (format === 'avif' ? 'avif' : 'webp');

        const response = await uploadVariantWithRetry(blob, {
          filename: `${cleanBaseName}-${name}.${ext}`,
          variantName: name,
          baseName: cleanBaseName,
          uploadId,
          width: variantInfo.width,
          height: variantInfo.height,
        }, signal);

        if (!response.data?.success) {
          throw new Error(response.data?.error || `Failed to upload ${name} variant`);
        }

        return {
          name,
          result: {
            r2Key: response.data.data.r2Key,
            width: variantInfo.width,
            height: variantInfo.height,
            sizeBytes: blob?.size,
          },
        };
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Store results
      batchResults.forEach(({ name, result }) => {
        uploadedVariants[name] = result;
      });

      // Update progress
      const completedCount = Object.keys(uploadedVariants).length;
      const uploadProgress = Math.round((completedCount / totalVariants) * 80) + 10;
      setProgress(prev => ({
        ...prev,
        uploading: uploadProgress,
        overall: 35 + Math.round((completedCount / totalVariants) * 50),
      }));
    }

    return uploadedVariants;
  }, [uploadVariantWithRetry]);

  /**
   * Main upload function
   */
  const uploadWithVariants = useCallback(async ({ file, cropArea, format, metadata }) => {
    abortUpload();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const assertNotAborted = () => {
      if (signal.aborted) {
        throw createAbortError();
      }
    };

    setIsUploading(true);
    setError(null);
    setProgress({ overall: 0, generating: 0, uploading: 0, finalizing: 0 });

    try {
      // === Step 0: Validate file ===
      assertNotAborted();
      const config = getConfig();
      const validation = validateFile(file, { ...FILE_CONSTRAINTS, maxSizeBytes: config.maxSizeBytes });
      if (!validation.valid) {
        throw validation.error;
      }

      // === Step 1: Apply crop to get source canvas ===
      setProgress(prev => ({ ...prev, generating: 10, overall: 5 }));
      const { canvas: sourceCanvas, width: sourceWidth, height: sourceHeight } =
        await applyCrop(file, cropArea, signal);
      assertNotAborted();

      // === Step 2: Generate all variants ===
      const variants = {};
      const variantBlobs = {};
      const variantNames = [];
      const originalExt = getFileExtension(file);

      // Always generate 'original' variant (cropped, native format)
      assertNotAborted();
      variantNames.push('original');
      const originalBlob = await new Promise((resolve, reject) => {
        sourceCanvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new UploadError(
            ERROR_TYPES.ENCODING_FAILED,
            'Original export failed',
            { userMessage: 'Could not process the original image.' }
          )),
          file.type || 'image/jpeg',
          config.encodingQuality.original / 100
        );
      });
      assertNotAborted();
      variantBlobs.original = originalBlob;
      variants.original = { width: sourceWidth, height: sourceHeight };

      // Generate lg, md, sm, xs variants (WebP/AVIF)
      setProgress(prev => ({ ...prev, generating: 30, overall: 15 }));
      
      let outputFormat = format;
      let targetQuality = outputFormat === 'avif' ? config.encodingQuality.avif : config.encodingQuality.webp;

      if (outputFormat === 'avif') {
        const testCanvas = createOptimizedCanvas(1, 1);
        const testCtx = getOptimizedContext(testCanvas);
        if (!testCtx) {
          throw new Error('Canvas context not available');
        }
        testCtx.drawImage(sourceCanvas, 0, 0, 1, 1);
        const testResult = await encodeCanvas(testCanvas, outputFormat, targetQuality, signal);
        if (testResult.outputFormat !== outputFormat) {
          outputFormat = testResult.outputFormat;
          targetQuality = outputFormat === 'avif' ? config.encodingQuality.avif : config.encodingQuality.webp;
        }
      }

      for (const [name, maxWidth] of Object.entries(config.variantSizes)) {
        assertNotAborted();
        const { canvas, width, height } = resizeCanvas(sourceCanvas, maxWidth);
        const { blob } = await encodeCanvas(canvas, outputFormat, targetQuality, signal);
        variantBlobs[name] = blob;
        variants[name] = { width, height };
        variantNames.push(name);
        await yieldToMain();
      }

      // Generate placeholder
      setProgress(prev => ({ ...prev, generating: 50, overall: 25 }));
      assertNotAborted();
      const placeholder = await generatePlaceholder(sourceCanvas);

      // === Step 3: Prepare upload ===
      setProgress(prev => ({ ...prev, generating: 100, uploading: 10, overall: 35 }));
      assertNotAborted();
      const cleanBaseName = (metadata.name || 'image')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);

      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      // === Step 4: Upload variants in parallel ===
      assertNotAborted();
      const uploadedVariants = await uploadVariantsInParallel(
        variantNames,
        variantBlobs,
        variants,
        cleanBaseName,
        uploadId,
        outputFormat,
        originalExt,
        file.type,
        signal
      );

      // === Step 5: Confirm upload (create D1 record) ===
      setProgress(prev => ({ ...prev, uploading: 100, finalizing: 50, overall: 90 }));
      assertNotAborted();

      const confirmResponse = await withRetry(
        () => mediaAPI.confirmUpload({
          uploadId,
          baseName: cleanBaseName,
          name: metadata.name,
          altText: metadata.altText,
          caption: metadata.caption || '',
          credit: metadata.credit || '',
          aspectRatio: metadata.aspectRatio || null,
          focalPoint: metadata.focalPoint || { x: 50, y: 50 },
          mimeType: outputFormat === 'avif' ? 'image/avif' : 'image/webp',
          variants: uploadedVariants,
          placeholder,
        }, { signal }),
        {
          maxRetries: UPLOAD_CONFIG.retryAttempts,
          baseDelay: UPLOAD_CONFIG.retryBaseDelayMs,
          shouldRetry: (err, attempt) => !isAbortError(err) && isRetryableError(err, attempt),
        }
      );

      setProgress(prev => ({ ...prev, finalizing: 100, overall: 100 }));

      if (confirmResponse.data?.success) {
        return {
          success: true,
          data: confirmResponse.data.data,
        };
      } else {
        throw new UploadError(
          ERROR_TYPES.CONFIRM_FAILED,
          confirmResponse.data?.error || 'Failed to confirm upload'
        );
      }

    } catch (err) {
      if (isAbortError(err)) {
        return {
          success: false,
          aborted: true,
        };
      }

      console.error('Upload failed:', err);

      // Convert to UploadError if needed
      const uploadError = err instanceof UploadError ? err : fromError(err);

      setError(uploadError.userMessage || uploadError.message || 'Upload failed');
      return {
        success: false,
        error: uploadError.userMessage || uploadError.message,
        errorType: uploadError.type,
        errorDetails: uploadError.toUserError(),
      };
    } finally {
      setIsUploading(false);
      abortRef.current = null;
      // Clean up resources after upload completes
      cleanupResources();
    }
  }, [
    applyCrop,
    createOptimizedCanvas,
    getOptimizedContext,
    resizeCanvas,
    encodeCanvas,
    generatePlaceholder,
    getConfig,
    getFileExtension,
    uploadVariantsInParallel,
    cleanupResources,
    abortUpload
  ]);

  return {
    uploadWithVariants,
    progress,
    isUploading,
    error,
    cleanupResources, // Expose for manual cleanup if needed
    abortUpload,
  };
}
