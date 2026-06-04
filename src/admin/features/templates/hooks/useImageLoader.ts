/**
 * useImageLoader.ts
 * =================
 * Optimized hook for preloading canvas images with global caching.
 *
 * Optimizations:
 * - Parallel loading via Promise.all
 * - Non-blocking decode via createImageBitmap()
 * - Global URL cache (Map<string, ImageBitmap>) — no per-image React state
 * - Type-safe with TypeScript strict
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getValue } from '@modules/templates/utils/dataBinding';
import type { EditorElement, ImageSlotElement } from '@admin/features/templates/store/useEditorStore';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ArticleData {
  image?: string;
  customImages?: Record<string, string>;
  imageScales?: Record<string, number>;
  imageOffsets?: Record<string, { x: number; y: number }>;
  [key: string]: unknown;
}

export interface UseImageLoaderOptions {
  elements: EditorElement[];
  articleData: ArticleData | null;
}

export interface UseImageLoaderResult {
  loadedImages: ReadonlyMap<string, ImageBitmap>;
  isLoading: boolean;
  error: string | null;
  setImage: (id: string, bitmap: ImageBitmap) => void;
  clearImage: (id: string) => void;
  clearAll: () => void;
  retryImage: (id: string, url: string) => Promise<ImageBitmap | null>;
}

/* ------------------------------------------------------------------ */
/*  Global cache (survives re-renders / remounts)                      */
/* ------------------------------------------------------------------ */

const globalImageCache = new Map<string, ImageBitmap>();
const globalLoadingSet = new Set<string>();
const globalFailedSet = new Set<string>();

/* ------------------------------------------------------------------ */
/*  getProxiedUrl utility                                              */
/* ------------------------------------------------------------------ */

export function getProxiedUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const urlObj = new URL(url);
    if (url.includes('/api/proxy-image')) return url;
    if (urlObj.hostname === window.location.hostname || urlObj.hostname === 'localhost') return url;
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  } catch {
    if (url.includes('://') || url.startsWith('//')) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  Core image loading (bitmap + cache)                                */
/* ------------------------------------------------------------------ */

async function fetchAndDecode(url: string): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

async function loadImageBitmap(id: string, url: string): Promise<ImageBitmap | null> {
  if (globalImageCache.has(id)) {
    return globalImageCache.get(id) ?? null;
  }
  if (globalLoadingSet.has(id)) {
    return null;
  }
  if (globalFailedSet.has(id)) {
    return null;
  }

  globalLoadingSet.add(id);

  const bitmap = await fetchAndDecode(url);

  globalLoadingSet.delete(id);

  if (bitmap) {
    globalImageCache.set(id, bitmap);
    return bitmap;
  }

  globalFailedSet.add(id);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useImageLoader({
  elements = [],
  articleData = null,
}: UseImageLoaderOptions): UseImageLoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local reactive mirror of the global cache so consumers re-render
  // when new images arrive, without storing ImageBitmaps in React state.
  const [, bumpVersion] = useState(0);
  const versionRef = useRef(0);

  const notify = useCallback(() => {
    versionRef.current += 1;
    bumpVersion(versionRef.current);
  }, []);

  /* ------------------ Set / Clear / Retry helpers ------------------ */

  const setImage = useCallback((id: string, bitmap: ImageBitmap) => {
    globalFailedSet.delete(id);
    globalImageCache.set(id, bitmap);
    notify();
  }, [notify]);

  const clearImage = useCallback((id: string) => {
    const bmp = globalImageCache.get(id);
    if (bmp) {
      bmp.close();
      globalImageCache.delete(id);
    }
    globalFailedSet.delete(id);
    globalLoadingSet.delete(id);
    notify();
  }, [notify]);

  const clearAll = useCallback(() => {
    globalImageCache.forEach((bmp) => bmp.close());
    globalImageCache.clear();
    globalFailedSet.clear();
    globalLoadingSet.clear();
    notify();
  }, [notify]);

  const retryImage = useCallback(
    async (id: string, url: string): Promise<ImageBitmap | null> => {
      globalFailedSet.delete(id);
      globalLoadingSet.delete(id);
      const proxied = getProxiedUrl(url);
      const bitmap = await loadImageBitmap(id, proxied);
      if (bitmap) {
        notify();
      }
      return bitmap;
    },
    [notify]
  );

  /* ------------------ Bulk preload effect -------------------------- */

  useEffect(() => {
    if (!elements || elements.length === 0) return;

    setIsLoading(true);
    setError(null);

    const imageElements = elements.filter(
      (el): el is ImageSlotElement => el.type === 'imageSlot'
    );

    const tasks: Promise<void>[] = [];

    for (const el of imageElements) {
      if (
        globalImageCache.has(el.id) ||
        globalLoadingSet.has(el.id) ||
        globalFailedSet.has(el.id)
      ) {
        continue;
      }

      // Priority: 1) customImages, 2) binding, 3) static image_url
      const customUrl = articleData?.customImages?.[el.id];
      let boundUrl: string | null = null;
      if (el.binding && articleData) {
        const resolved = getValue(articleData, el.binding);
        if (typeof resolved === 'string') boundUrl = resolved;
      }
      const rawUrl = customUrl || boundUrl || el.image_url;

      if (rawUrl) {
        const proxied = getProxiedUrl(rawUrl);
        tasks.push(
          loadImageBitmap(el.id, proxied).then((bitmap) => {
            if (!bitmap) {
              setError(`Failed to load image: ${el.id}`);
            }
          })
        );
      }
    }

    // Load article main image
    if (
      articleData?.image &&
      !globalImageCache.has('article_main') &&
      !globalLoadingSet.has('article_main') &&
      !globalFailedSet.has('article_main')
    ) {
      const proxied = getProxiedUrl(articleData.image);
      tasks.push(
        loadImageBitmap('article_main', proxied).then((bitmap) => {
          if (!bitmap) {
            setError(`Failed to load article main image`);
          }
        })
      );
    }

    if (tasks.length > 0) {
      Promise.all(tasks).finally(() => {
        setIsLoading(false);
        notify();
      });
    } else {
      setIsLoading(false);
    }
  }, [elements, articleData, notify]);

  return {
    loadedImages: globalImageCache,
    isLoading,
    error,
    setImage,
    clearImage,
    clearAll,
    retryImage,
  };
}

export default useImageLoader;
