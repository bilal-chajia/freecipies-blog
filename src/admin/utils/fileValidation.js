/**
 * File Validation Utilities
 * 
 * Common validation patterns for file and URL handling.
 * Centralizes logic that was previously duplicated across components.
 */

import { FILE_CONSTRAINTS } from '../components/ImageUploader/config';

/**
 * Check if a File object is a valid image type
 * @param {File} file - The file to validate
 * @returns {boolean}
 */
export const isValidImageFile = (file) => {
  if (!file || !file.type) return false;
  return file.type.startsWith('image/');
};

/**
 * Check if a File object is a supported upload type
 * @param {File} file - The file to validate
 * @returns {boolean}
 */
export const isSupportedImageType = (file) => {
  if (!file || !file.type) return false;
  return FILE_CONSTRAINTS.supportedTypes.includes(file.type);
};

/**
 * Check if a URL points to an image file
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(url);
};

/**
 * Check if a URL is valid (well-formed)
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if file size is within limits
 * @param {File} file - The file to check
 * @param {number} maxBytes - Maximum allowed size (defaults to config)
 * @returns {boolean}
 */
export const isFileSizeValid = (file, maxBytes = FILE_CONSTRAINTS.maxSizeBytes) => {
  if (!file || typeof file.size !== 'number') return false;
  return file.size <= maxBytes;
};

/**
 * Get file extension from filename (lowercase)
 * @param {string} filename - The filename
 * @returns {string} Extension without dot, or empty string
 */
export const getFileExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Get filename without extension
 * @param {string} filename - The filename
 * @returns {string} Filename without extension
 */
export const getFilenameWithoutExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  return filename.replace(/\.[^/.]+$/, '');
};
