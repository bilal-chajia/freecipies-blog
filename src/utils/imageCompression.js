/**
 * Image Compression Utility for SEO & Core Web Vitals
 * - Converts images to WebP format
 * - Resizes images exceeding max dimensions
 * - Applies quality compression
 */

/**
 * Quality presets for compression
 */
export const QUALITY_PRESETS = {
    low: { quality: 0.6, label: 'Low (Smallest file)' },
    medium: { quality: 0.75, label: 'Medium (Balanced)' },
    high: { quality: 0.85, label: 'High (Best quality)' },
    original: { quality: 0.92, label: 'Original (Minimal compression)' },
};

/**
 * Default compression settings optimized for Core Web Vitals
 */
const DEFAULT_OPTIONS = {
    maxWidth: 1920,       // Standard HD width - good for hero images
    maxHeight: 1920,      // Max height to maintain aspect ratio
    quality: 0.85,        // 85% quality - optimal balance
    format: 'image/webp', // WebP for best compression
};

/**
 * Load an image from a File or Blob
 */
const loadImage = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(img);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Calculate new dimensions maintaining aspect ratio
 */
const calculateDimensions = (width, height, maxWidth, maxHeight) => {
    let newWidth = width;
    let newHeight = height;

    // Only resize if image exceeds max dimensions
    if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
            // Landscape
            newWidth = Math.min(width, maxWidth);
            newHeight = Math.round(newWidth / aspectRatio);
        } else {
            // Portrait or square
            newHeight = Math.min(height, maxHeight);
            newWidth = Math.round(newHeight * aspectRatio);
        }
    }

    return { width: newWidth, height: newHeight };
};

/**
 * Compress an image file
 * @param {File} file - The original image file
 * @param {Object} options - Compression options
 * @returns {Promise<{file: File, stats: Object}>} - Compressed file and stats
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = DEFAULT_OPTIONS.maxWidth,
        maxHeight = DEFAULT_OPTIONS.maxHeight,
        quality = DEFAULT_OPTIONS.quality,
        format = DEFAULT_OPTIONS.format,
    } = options;

    // Skip non-image files
    if (!file.type.startsWith('image/')) {
        return { file, stats: { skipped: true, reason: 'Not an image' } };
    }

    // Skip GIF animations (they lose animation when converted)
    if (file.type === 'image/gif') {
        return { file, stats: { skipped: true, reason: 'GIF preserved' } };
    }

    const originalSize = file.size;
    const startTime = performance.now();

    try {
        // Load the image
        const img = await loadImage(file);
        const originalWidth = img.width;
        const originalHeight = img.height;

        // Calculate new dimensions
        const { width: newWidth, height: newHeight } = calculateDimensions(
            originalWidth,
            originalHeight,
            maxWidth,
            maxHeight
        );

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to create blob'));
                },
                format,
                quality
            );
        });

        // Generate new filename with .webp extension
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const newFilename = `${originalName}.webp`;

        // Create new File object
        const compressedFile = new File([blob], newFilename, {
            type: format,
            lastModified: Date.now(),
        });

        const processingTime = Math.round(performance.now() - startTime);
        const compressionRatio = ((1 - compressedFile.size / originalSize) * 100).toFixed(1);

        return {
            file: compressedFile,
            stats: {
                originalSize,
                compressedSize: compressedFile.size,
                compressionRatio: `${compressionRatio}%`,
                originalDimensions: `${originalWidth}x${originalHeight}`,
                newDimensions: `${newWidth}x${newHeight}`,
                wasResized: newWidth !== originalWidth || newHeight !== originalHeight,
                format,
                quality: `${Math.round(quality * 100)}%`,
                processingTime: `${processingTime}ms`,
            },
        };
    } catch (error) {
        console.error('Image compression failed:', error);
        // Return original file if compression fails
        return {
            file,
            stats: {
                skipped: true,
                reason: 'Compression failed',
                error: error.message,
            },
        };
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
