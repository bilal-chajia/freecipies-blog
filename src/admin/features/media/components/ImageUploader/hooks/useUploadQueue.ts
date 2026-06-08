/**
 * useUploadQueue - Hook for managing multi-upload queue
 */

import { useState, useCallback, useRef } from 'react';
import type { QueueItem, QueueItemStatus, UploadResultData } from '../types';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseUploadQueueReturn {
  queue: QueueItem[];
  currentIndex: number;
  currentItem: QueueItem | null;
  isQueueActive: boolean;
  pendingCount: number;
  addFiles: (files: File[]) => void;
  addUrls: (urls: string[]) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  startQueue: () => void;
  nextItem: () => void;
  skipItem: () => void;
  markItemUploading: (index: number) => void;
  markItemDone: (index: number, result: UploadResultData) => void;
  markItemError: (index: number, error: string) => void;
  retryItem: (id: string) => void;
  setItemFinalName: (index: number, finalName: string) => void;
  resetCurrentIndex: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUploadQueue(): UseUploadQueueReturn {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const previewUrlsRef = useRef<Map<string, string>>(new Map());

  const addFiles = useCallback((files: File[]) => {
    const newItems: QueueItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      type: 'file' as const,
      source: file,
      name: file.name,
      status: 'pending' as QueueItemStatus,
      previewUrl: URL.createObjectURL(file),
    }));

    newItems.forEach(item => {
      if (item.previewUrl) {
        previewUrlsRef.current.set(item.id, item.previewUrl);
      }
    });

    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const addUrls = useCallback((urls: string[]) => {
    const newItems: QueueItem[] = urls.map(url => ({
      id: crypto.randomUUID(),
      type: 'url' as const,
      source: url,
      name: url.split('/').pop()?.split('?')[0] || 'imported',
      status: 'pending' as QueueItemStatus,
      previewUrl: null,
    }));
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    const previewUrl = previewUrlsRef.current.get(id);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrlsRef.current.delete(id);
    }
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    previewUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore cleanup errors
      }
    });
    previewUrlsRef.current.clear();
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const startQueue = useCallback(() => {
    if (queue.length > 0) {
      setCurrentIndex(0);
    }
  }, [queue.length]);

  const nextItem = useCallback(() => {
    setQueue(q => {
      const currentItem = q[currentIndex];
      if (currentItem) {
        const updated = q.map((item, i) =>
          i === currentIndex ? { ...item, status: 'uploading' as QueueItemStatus } : item
        );

        const nextIndex = updated.findIndex((item, i) =>
          i > currentIndex && item.status === 'pending'
        );

        setCurrentIndex(nextIndex >= 0 ? nextIndex : -1);
        return updated;
      }
      return q;
    });
  }, [currentIndex]);

  const skipItem = useCallback(() => {
    setQueue(q => {
      const updated = q.map((item, i) =>
        i === currentIndex ? { ...item, status: 'skipped' as QueueItemStatus } : item
      );

      const nextIndex = updated.findIndex((item, i) =>
        i > currentIndex && item.status === 'pending'
      );

      setCurrentIndex(nextIndex >= 0 ? nextIndex : -1);
      return updated;
    });
  }, [currentIndex]);

  const markItemUploading = useCallback((index: number) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'uploading' as QueueItemStatus } : item
    ));
  }, []);

  const markItemDone = useCallback((index: number, result: UploadResultData) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'done' as QueueItemStatus, result } : item
    ));
  }, []);

  const markItemError = useCallback((index: number, error: string) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'error' as QueueItemStatus, error } : item
    ));
  }, []);

  const retryItem = useCallback((id: string) => {
    const index = queue.findIndex(i => i.id === id);
    if (index < 0) return;

    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'pending' as QueueItemStatus, error: undefined } : item
    ));
    setCurrentIndex(index);
  }, [queue]);

  const setItemFinalName = useCallback((index: number, finalName: string) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, finalName } : item
    ));
  }, []);

  const resetCurrentIndex = useCallback(() => setCurrentIndex(-1), []);

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const isQueueActive = currentIndex >= 0;
  const currentItem: QueueItem | null = currentIndex >= 0 ? (queue[currentIndex] ?? null) : null;

  return {
    queue,
    currentIndex,
    currentItem,
    isQueueActive,
    pendingCount,
    addFiles,
    addUrls,
    removeItem,
    clearQueue,
    startQueue,
    nextItem,
    skipItem,
    markItemUploading,
    markItemDone,
    markItemError,
    retryItem,
    setItemFinalName,
    resetCurrentIndex,
  };
}
