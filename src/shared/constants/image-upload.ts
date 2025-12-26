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
