import { useState, useEffect, useCallback } from 'react';

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

    /**
     * Load a single image with error handling
     */
    const loadImage = useCallback((id, url, rawUrl) => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                setLoadedImages(prev => ({ ...prev, [id]: img }));
                resolve(img);
            };

            img.onerror = () => {
                // If proxy fails, try direct (fallback, though unlikely to work for CORS)
                if (url.includes('/api/proxy-image') && rawUrl) {
                    img.src = rawUrl;
                } else {
                    setError(`Failed to load image: ${id}`);
                    resolve(null);
                }
            };

            img.src = url;
        });
    }, []);

    // Preload images for image slot elements
    // NOTE: loadedImages is NOT in deps to avoid infinite loop (effect updates loadedImages via setLoadedImages)
    useEffect(() => {
        if (!elements || elements.length === 0) return;

        const loadElementImages = async () => {
            setIsLoading(true);
            setError(null);

            const imageElements = elements.filter(el => el.type === 'imageSlot');

            for (const el of imageElements) {
                // Check for custom image from articleData first
                const customUrl = articleData?.customImages?.[el.id];
                const rawUrl = customUrl || el.imageUrl;
                const imageUrl = getProxiedUrl(rawUrl);

                if (imageUrl) {
                    // Use functional update to check current state without deps
                    setLoadedImages(prev => {
                        const currentImg = prev[el.id];

                        // Load if not present
                        if (!currentImg) {
                            // Trigger load outside of setState
                            loadImage(el.id, imageUrl, rawUrl);
                        } else if (customUrl &&
                            !currentImg.src.includes(encodeURIComponent(customUrl)) &&
                            currentImg.src !== customUrl) {
                            // Custom URL changed - reload
                            loadImage(el.id, imageUrl, rawUrl);
                        }

                        return prev; // Don't modify state here
                    });
                }
            }

            // Load article main image
            if (articleData?.image) {
                setLoadedImages(prev => {
                    if (!prev['article_main']) {
                        const rawUrl = articleData.image;
                        const imageUrl = getProxiedUrl(rawUrl);
                        loadImage('article_main', imageUrl, rawUrl);
                    }
                    return prev;
                });
            }

            setIsLoading(false);
        };

        loadElementImages();
    }, [elements, articleData, loadImage]); // Removed loadedImages from deps!

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
