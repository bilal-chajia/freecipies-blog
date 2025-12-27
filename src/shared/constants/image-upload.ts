/**
 * Image Upload Settings - Centralized Defaults
 * =============================================
 * Single source of truth for image upload configuration.
 * Used by both frontend hooks and backend services.
 */

export const IMAGE_UPLOAD_DEFAULTS = {
    webpQuality: 80,
    avifQuality: 70,
    maxFileSizeMB: 50,
    variantLg: 2048,
    variantMd: 1200,
    variantSm: 720,
    variantXs: 360,
    defaultFormat: 'webp',
    defaultAspectRatio: 'free',
    defaultCredit: '',
} as const;

export type ImageUploadSettings = typeof IMAGE_UPLOAD_DEFAULTS;

/** Cache key for localStorage */
export const IMAGE_SETTINGS_CACHE_KEY = 'image_upload_settings';

/** Cache TTL in milliseconds (5 minutes) */
export const IMAGE_SETTINGS_CACHE_TTL = 5 * 60 * 1000;

/** Database key for site_settings table */
export const IMAGE_SETTINGS_DB_KEY = 'image_upload_settings';

/** Aspect ratio options for the UI */
export const ASPECT_RATIO_OPTIONS = [
    { value: 'free', label: 'Free (no constraint)' },
    { value: '1:1', label: '1:1 Square' },
    { value: '16:9', label: '16:9 Widescreen' },
    { value: '4:3', label: '4:3 Standard' },
    { value: '2:3', label: '2:3 Portrait' },
    { value: '3:2', label: '3:2 Landscape' },
    { value: '9:16', label: '9:16 Vertical' },
    { value: '4:5', label: '4:5 Photo' },
] as const;

/** Variant sizes derived from defaults */
export const IMAGE_VARIANT_SIZES = {
    lg: IMAGE_UPLOAD_DEFAULTS.variantLg,
    md: IMAGE_UPLOAD_DEFAULTS.variantMd,
    sm: IMAGE_UPLOAD_DEFAULTS.variantSm,
    xs: IMAGE_UPLOAD_DEFAULTS.variantXs,
} as const;

/** Encoding quality defaults */
export const IMAGE_ENCODING_QUALITY = {
    webp: IMAGE_UPLOAD_DEFAULTS.webpQuality,
    avif: IMAGE_UPLOAD_DEFAULTS.avifQuality,
    original: 95,
    placeholder: 50,
} as const;

/** Placeholder (LQIP) settings */
export const IMAGE_PLACEHOLDER_CONFIG = {
    width: 30,
    format: 'image/jpeg',
    quality: 0.5,
} as const;

/** Supported MIME types for uploads */
export const IMAGE_SUPPORTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
] as const;

/** Supported output formats */
export const IMAGE_SUPPORTED_OUTPUT_FORMATS = ['webp', 'avif'] as const;

/** File constraints for client-side validation */
export const IMAGE_FILE_CONSTRAINTS = {
    maxSizeBytes: IMAGE_UPLOAD_DEFAULTS.maxFileSizeMB * 1024 * 1024,
    supportedTypes: IMAGE_SUPPORTED_TYPES,
    supportedOutputFormats: IMAGE_SUPPORTED_OUTPUT_FORMATS,
} as const;

/** Upload behavior defaults */
export const IMAGE_UPLOAD_BEHAVIOR = {
    maxConcurrentUploads: 3,
    retryAttempts: 3,
    retryBaseDelayMs: 1000,
} as const;

/** Canvas configuration for image processing */
export const IMAGE_CANVAS_CONFIG = {
    alpha: false,
    desynchronized: true,
    imageSmoothingQuality: 'high' as const,
} as const;

const parseAspectRatio = (value: string): number | null => {
    if (value === 'free') return null;
    const [w, h] = value.split(':').map(Number);
    if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return null;
    return w / h;
};

/** Aspect ratio map for cropper widgets */
export const IMAGE_ASPECT_RATIOS: Record<string, number | null> = ASPECT_RATIO_OPTIONS.reduce(
    (acc, option) => {
        acc[option.value] = parseAspectRatio(option.value);
        return acc;
    },
    {} as Record<string, number | null>
);

/** Aspect ratio labels keyed by ratio string */
export const IMAGE_ASPECT_RATIO_LABELS: Record<string, string> = ASPECT_RATIO_OPTIONS.reduce(
    (acc, option) => {
        acc[option.value] = option.label;
        return acc;
    },
    {} as Record<string, string>
);
