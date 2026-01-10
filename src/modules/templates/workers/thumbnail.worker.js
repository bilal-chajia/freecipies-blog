/**
 * Thumbnail Worker
 * Handles image processing operations off the main thread to prevent UI freezing.
 */

// Listen for messages from the main thread
self.onmessage = async (e) => {
    const { id, file, maxWidth, type } = e.data;

    try {
        if (type === 'resize') {
            const blob = await resizeImage(file, maxWidth);
            self.postMessage({ id, blob, success: true });
        }
    } catch (error) {
        self.postMessage({ id, error: error.message, success: false });
    }
};

/**
 * Resize image using OffscreenCanvas (if available) or standard Canvas API
 */
async function resizeImage(file, maxWidth) {
    const bitmap = await createImageBitmap(file);

    // Calculate new dimensions
    const ratio = Math.min(maxWidth / bitmap.width, 1);
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    // Use OffscreenCanvas for worker
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to blob
    const blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality: 0.7
    });

    // Clean up
    bitmap.close();

    return blob;
}
