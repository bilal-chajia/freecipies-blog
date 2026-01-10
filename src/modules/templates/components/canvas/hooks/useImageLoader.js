import { useState, useEffect, useCallback, useRef } from 'react';

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
    const loadedUrlsRef = useRef(new Map());
    const isMountedRef = useRef(true);

    /**
     * Load a single image with error handling
     */
    const loadImage = useCallback((id, url, rawUrl) => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                loadedUrlsRef.current.set(id, url);
                if (isMountedRef.current) {
                    setLoadedImages(prev => ({ ...prev, [id]: img }));
                }
                resolve(img);
            };

            img.onerror = () => {
                // If proxy fails, try direct (fallback, though unlikely to work for CORS)
                if (url.includes('/api/proxy-image') && rawUrl) {
                    img.src = rawUrl;
                } else {
                    if (isMountedRef.current) {
                        setError(`Failed to load image: ${id}`);
                    }
                    resolve(null);
                }
            };

            img.src = url;
        });
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Preload images for image slot elements
    useEffect(() => {
        const imageElements = elements.filter(el => el.type === 'imageSlot');
        const elementIds = new Set(imageElements.map(el => el.id));
        const keepIds = new Set(elementIds);
        if (articleData?.image) keepIds.add('article_main');

        loadedUrlsRef.current.forEach((_, id) => {
            if (!keepIds.has(id)) {
                loadedUrlsRef.current.delete(id);
            }
        });

        setLoadedImages(prev => {
            const next = {};
            Object.entries(prev).forEach(([id, img]) => {
                if (id === 'article_main') {
                    if (articleData?.image) next[id] = img;
                    return;
                }
                if (elementIds.has(id)) next[id] = img;
            });
            return next;
        });

        const loadElementImages = async () => {
            const targets = [];
            setError(null);

            for (const el of imageElements) {
                // Check for custom image from articleData first
                const customUrl = articleData?.customImages?.[el.id];
                const rawUrl = customUrl || el.imageUrl;
                const imageUrl = getProxiedUrl(rawUrl);

                if (imageUrl) {
                    const currentUrl = loadedUrlsRef.current.get(el.id);
                    if (currentUrl !== imageUrl) {
                        targets.push({ id: el.id, url: imageUrl, rawUrl });
                    }
                }
            }

            // Load article main image
            if (articleData?.image) {
                const rawUrl = articleData.image;
                const imageUrl = getProxiedUrl(rawUrl);
                const currentUrl = loadedUrlsRef.current.get('article_main');
                if (currentUrl !== imageUrl) {
                    targets.push({ id: 'article_main', url: imageUrl, rawUrl });
                }
            }

            if (targets.length === 0) {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
                return;
            }

            setIsLoading(true);
            await Promise.all(targets.map(target => loadImage(target.id, target.url, target.rawUrl)));

            if (isMountedRef.current) {
                setIsLoading(false);
            }
        };

        loadElementImages();
    }, [elements, articleData, loadImage]);

    /**
     * Manually set a loaded image (for external sources)
     */
    const setImage = useCallback((id, image) => {
        setLoadedImages(prev => ({ ...prev, [id]: image }));
    }, []);

    /**
     * Clear a loaded image
     */
    const clearImage = useCallback((id) => {
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
        setLoadedImages({});
    }, []);

    return {
        loadedImages,
        isLoading,
        error,
        setImage,
        clearImage,
        clearAll,
        getProxiedUrl,
    };
};

export default useImageLoader;
