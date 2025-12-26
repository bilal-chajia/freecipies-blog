/**
 * Image Upload Configuration
 * 
 * Centralized constants for the image upload module.
 * Change these values to adjust upload behavior globally.
 */

// Variant size configurations (max width in pixels)
export const VARIANT_SIZES = {
  lg: 2048,
  md: 1200,
  sm: 720,
  xs: 360,
};

// Encoding quality settings (0-100)
export const ENCODING_QUALITY = {
  webp: 80,
  avif: 70,
  original: 95,  // For native format export
  placeholder: 50,
};

// Placeholder (LQIP) settings
export const PLACEHOLDER_CONFIG = {
  width: 30,  // Width in pixels (height calculated from aspect ratio)
  format: 'image/jpeg',
  quality: 0.5,
};

// File constraints
export const FILE_CONSTRAINTS = {
  maxSizeBytes: 50 * 1024 * 1024,  // 50MB
  supportedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  supportedOutputFormats: ['webp', 'avif'],
};

// Aspect ratio presets
export const ASPECT_RATIOS = {
  free: null,
  '1:1': 1,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '2:3': 2 / 3,
  '3:2': 3 / 2,
  '9:16': 9 / 16,
  '4:5': 4 / 5,
};

// User-friendly display labels for aspect ratios
export const ASPECT_RATIO_LABELS = {
  free: 'Free (no constraint)',
  '1:1': '1:1 Square',
  '16:9': '16:9 Widescreen',
  '4:3': '4:3 Standard',
  '2:3': '2:3 Portrait',
  '3:2': '3:2 Landscape',
  '9:16': '9:16 Vertical',
  '4:5': '4:5 Photo',
};

// Upload behavior
export const UPLOAD_CONFIG = {
  maxConcurrentUploads: 3,  // For parallel variant uploads
  retryAttempts: 3,
  retryBaseDelayMs: 1000,  // Exponential backoff base
};

// Canvas optimization settings
export const CANVAS_CONFIG = {
  alpha: false,  // Disable alpha for better performance on photos
  desynchronized: true,  // Allow async canvas operations
  imageSmoothingQuality: 'high',
};
