import { useState, useEffect, useCallback, useRef } from 'react';
import { getValue } from '../../../utils/dataBinding';

/**
 * Get proxied URL for CORS-safe image loading
 * @param {string} url - Original image URL
 * @returns {string} - Proxied URL or original if safe
 */
export const getProxiedUrl = (url) => {
    if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
    try {
        const urlObj = new URL(url);
        // Check if it's already using our proxy to avoid double proxying
        if (url.includes('/api/proxy-image')) return url;
        if (urlObj.hostname === window.location.hostname || urlObj.hostname === 'localhost') return url;
        return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    } catch {
        // URL is relative or invalid - proxy it if it looks like a full URL path
        if (url.includes('://') || url.startsWith('//')) {
            return `/api/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    }
};

/**
 * useImageLoader - Custom hook for preloading canvas images
 * 
 * Handles:
 * - Element image slots (with custom override support)
 * - Article main image
 * - CORS proxy for external URLs
 * - Error fallback
 * 
 * @param {Object} options - Configuration
 * @param {Array} options.elements - Canvas elements array
 * @param {Object} options.articleData - Article data with images
 * @returns {Object} - Loaded images map and loading state
 */
const useImageLoader = ({ elements = [], articleData = null }) => {
    const [loadedImages, setLoadedImages] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Track which images are currently loading or have been attempted
    const loadingRef = useRef(new Set());
    const failedRef = useRef(new Set());
    const loadedRef = useRef(new Set()); // Track successfully loaded

    /**
     * Load a single image with error handling (no retry on failure)
     */
    const loadImage = useCallback((id, url) => {
        // Skip if already loading, loaded, or failed
        if (loadingRef.current.has(id) || failedRef.current.has(id)) {
            return Promise.resolve(null);
        }

        loadingRef.current.add(id);

        return new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                loadingRef.current.delete(id);
                loadedRef.current.add(id);
                setLoadedImages(prev => ({ ...prev, [id]: img }));
                resolve(img);
            };

            img.onerror = () => {
                loadingRef.current.delete(id);
                failedRef.current.add(id);
                console.warn(`[ImageLoader] Failed to load image: ${id} - ${url}`);
                setError(`Failed to load image: ${id}`);
                resolve(null);
            };

            img.src = url;
        });
    }, []);

    // Preload images for image slot elements
    // Using a ref to track initialization to prevent multiple runs
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        // Only run once per component lifecycle
        if (hasInitializedRef.current) return;
        if (!elements || elements.length === 0) return;

        hasInitializedRef.current = true;

        const loadElementImages = async () => {
            setIsLoading(true);
            setError(null);

            const imageElements = elements.filter(el => el.type === 'imageSlot');

            for (const el of imageElements) {
                // Skip if already loading, loaded, or failed
                if (loadedRef.current.has(el.id) || loadingRef.current.has(el.id) || failedRef.current.has(el.id)) {
                    continue;
                }

                // Priority: 1) Custom image from articleData, 2) Binding from element, 3) Static imageUrl
                const customUrl = articleData?.customImages?.[el.id];

                // If element has binding, try to resolve it from articleData
                let boundUrl = null;
                if (el.binding && articleData) {
                    boundUrl = getValue(articleData, el.binding);
                }

                const rawUrl = customUrl || boundUrl || el.imageUrl;

                if (rawUrl) {
                    const imageUrl = getProxiedUrl(rawUrl);
                    loadImage(el.id, imageUrl);
                }
            }

            // Load article main image
            if (articleData?.image && !loadedRef.current.has('article_main') && !loadingRef.current.has('article_main') && !failedRef.current.has('article_main')) {
                const rawUrl = articleData.image;
                const imageUrl = getProxiedUrl(rawUrl);
                loadImage('article_main', imageUrl);
            }

            setIsLoading(false);
        };

        loadElementImages();
    }, [elements, articleData, loadImage]); // IMPORTANT: No loadedImages here!

    /**
     * Manually set a loaded image (for external sources)
     */
    const setImage = useCallback((id, image) => {
        failedRef.current.delete(id); // Clear failed state if manually setting
        setLoadedImages(prev => ({ ...prev, [id]: image }));
    }, []);

    /**
     * Clear a loaded image
     */
    const clearImage = useCallback((id) => {
        failedRef.current.delete(id);
        loadingRef.current.delete(id);
        setLoadedImages(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    /**
     * Clear all loaded images
     */
    const clearAll = useCallback(() => {
        failedRef.current.clear();
        loadingRef.current.clear();
        setLoadedImages({});
    }, []);

    /**
     * Retry loading a failed image
     */
    const retryImage = useCallback((id, url) => {
        failedRef.current.delete(id);
        loadingRef.current.delete(id);
        return loadImage(id, getProxiedUrl(url));
    }, [loadImage]);

    return {
        loadedImages,
        isLoading,
        error,
        setImage,
        clearImage,
        clearAll,
        retryImage,
        getProxiedUrl,
    };
};

export default useImageLoader;
