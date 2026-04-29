/**
 * useUploadQueue - Hook for managing multi-upload queue
 */

import { useState, useCallback, useRef } from 'react';

export function useUploadQueue() {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const previewUrlsRef = useRef(new Map());

  const addFiles = useCallback((files) => {
    const newItems = files.map(file => ({
      id: crypto.randomUUID(),
      type: 'file',
      source: file,
      name: file.name,
      status: 'pending',
      previewUrl: URL.createObjectURL(file),
    }));
    
    newItems.forEach(item => {
      previewUrlsRef.current.set(item.id, item.previewUrl);
    });
    
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const addUrls = useCallback((urls) => {
    const newItems = urls.map(url => ({
      id: crypto.randomUUID(),
      type: 'url',
      source: url,
      name: url.split('/').pop()?.split('?')[0] || 'imported',
      status: 'pending',
      previewUrl: null,
    }));
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id) => {
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
        // Mark current as uploading
        const updated = q.map((item, i) =>
          i === currentIndex ? { ...item, status: 'uploading' } : item
        );
        
        // Find next pending
        const nextIndex = updated.findIndex((item, i) =>
          i > currentIndex && item.status === 'pending'
        );
        
        if (nextIndex >= 0) {
          setCurrentIndex(nextIndex);
        } else {
          setCurrentIndex(-1);
        }
        
        return updated;
      }
      return q;
    });
  }, [currentIndex]);

  const skipItem = useCallback(() => {
    setQueue(q => {
      const updated = q.map((item, i) =>
        i === currentIndex ? { ...item, status: 'skipped' } : item
      );
      
      const nextIndex = updated.findIndex((item, i) =>
        i > currentIndex && item.status === 'pending'
      );
      
      if (nextIndex >= 0) {
        setCurrentIndex(nextIndex);
      } else {
        setCurrentIndex(-1);
      }
      
      return updated;
    });
  }, [currentIndex]);

  const markItemUploading = useCallback((index) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'uploading' } : item
    ));
  }, []);

  const markItemDone = useCallback((index, result) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'done', result } : item
    ));
  }, []);

  const markItemError = useCallback((index, error) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'error', error } : item
    ));
  }, []);

  const retryItem = useCallback((id) => {
    const index = queue.findIndex(i => i.id === id);
    if (index < 0) return;
    
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, status: 'pending', error: undefined } : item
    ));
    setCurrentIndex(index);
  }, [queue]);

  const setItemFinalName = useCallback((index, finalName) => {
    setQueue(q => q.map((item, i) =>
      i === index ? { ...item, finalName } : item
    ));
  }, []);

  const resetCurrentIndex = useCallback(() => setCurrentIndex(-1), []);

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const isQueueActive = currentIndex >= 0;
  const currentItem = currentIndex >= 0 ? queue[currentIndex] : null;

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
