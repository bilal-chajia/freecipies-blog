import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Generate slug from string
 */
export const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Truncate string to specified length
 */
export const truncate = (str, length = 100) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format date to readable string
 */
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// ============================================
// JSON UTILITIES
// ============================================

/**
 * Safely parse JSON string
 */
export const safeJSONParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    console.error('JSON parse error');
    return fallback;
  }
};

/**
 * Safely stringify JSON
 */
export const safeJSONStringify = (obj, pretty = false) => {
  try {
    return JSON.stringify(obj, null, pretty ? 2 : 0);
  } catch {
    console.error('JSON stringify error');
    return '';
  }
};

/**
 * Validate JSON string
 */
export const isValidJSON = (str) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

// ============================================
// FILE UTILITIES
// ============================================

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  return filename.split('.').pop();
};

/**
 * Check if file is image
 */
export const isImageFile = (filename) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const ext = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(ext);
};

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate URL
 */
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate slug (lowercase, alphanumeric, hyphens)
 */
export const isValidSlug = (slug) => {
  const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return re.test(slug);
};

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Remove duplicates from array
 */
export const uniqueArray = (arr) => {
  return [...new Set(arr)];
};

/**
 * Sort array of objects by key
 */
export const sortByKey = (arr, key, order = 'asc') => {
  return [...arr].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

// ============================================
// OBJECT UTILITIES
// ============================================

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove empty values from object
 */
export const removeEmpty = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== '')
  );
};

// ============================================
// NUMBER UTILITIES
// ============================================

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  if (num == null || num === undefined || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\ d))/g, ',');
};

/**
 * Generate random ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colors = {
    online: 'green',
    offline: 'red',
    draft: 'yellow',
    published: 'blue',
    archived: 'gray',
  };
  return colors[status] || 'gray';
};

/**
 * Get type color
 */
/**
 * Get type color
 */
export const getTypeColor = (type) => {
  const colors = {
    article: 'blue',
    recipe: 'orange',
  };
  return colors[type] || 'gray';
};

/**
 * Get contrast text color (black or white) for a given hex background
 */
export const getContrastColor = (hex) => {
  if (!hex) return 'white';

  // Remove hash if present
  hex = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate brightness (yiq)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

  return (yiq >= 128) ? 'black' : 'white';
};

// ============================================
// COPY TO CLIPBOARD
// ============================================

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

// ============================================
// DEBOUNCE
// ============================================

/**
 * Debounce function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  generateSlug,
  truncate,
  capitalize,
  formatDate,
  formatRelativeTime,
  safeJSONParse,
  safeJSONStringify,
  isValidJSON,
  formatFileSize,
  getFileExtension,
  isImageFile,
  isValidEmail,
  isValidURL,
  isValidSlug,
  uniqueArray,
  sortByKey,
  deepClone,
  removeEmpty,
  formatNumber,
  generateId,
  getStatusColor,
  getTypeColor,
  copyToClipboard,
  debounce,
};

