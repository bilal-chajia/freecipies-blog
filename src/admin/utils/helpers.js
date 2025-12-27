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
// MEDIA VARIANT UTILITIES
// ============================================

export const parseVariantsJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeVariantEntry = (variant) => {
  if (!variant || typeof variant !== 'object') return null;
  if (!variant.url) return null;
  return {
    url: variant.url,
    width: variant.width ?? 0,
    height: variant.height ?? 0,
    sizeBytes: variant.sizeBytes ?? variant.size_bytes,
  };
};

const normalizeMediaVariants = (parsed) => {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.variants && typeof parsed.variants === 'object') {
    return parsed.variants;
  }
  return parsed;
};

export const buildImageSlotFromMedia = (item, overrides = {}) => {
  const parsed = parseVariantsJson(item?.variantsJson || item?.variants_json);
  const variantMap = normalizeMediaVariants(parsed);
  const variants = {};

  if (variantMap && typeof variantMap === 'object') {
    Object.entries(variantMap).forEach(([key, variant]) => {
      const normalized = normalizeVariantEntry(variant);
      if (normalized?.url) {
        variants[key] = normalized;
      }
    });
  }

  const alt = overrides.alt ?? item?.altText ?? item?.alt ?? '';
  const caption = overrides.caption ?? item?.caption ?? '';
  const credit = overrides.credit ?? item?.credit ?? '';
  const placeholder = overrides.placeholder ?? parsed?.placeholder ?? item?.placeholder ?? '';
  const aspectRatio = overrides.aspectRatio ?? item?.aspectRatio ?? item?.aspect_ratio;
  const focalPointRaw = overrides.focal_point ?? item?.focalPointJson ?? item?.focal_point_json;
  const focalPoint = (() => {
    if (!focalPointRaw) return undefined;
    if (typeof focalPointRaw === 'object') return focalPointRaw;
    try {
      return JSON.parse(focalPointRaw);
    } catch {
      return undefined;
    }
  })();

  const slot = {
    media_id: item?.id ?? overrides.media_id,
    alt: alt || undefined,
    caption: caption || undefined,
    credit: credit || undefined,
    placeholder: placeholder || undefined,
    aspectRatio: aspectRatio || undefined,
    focal_point: focalPoint,
    variants: Object.keys(variants).length ? variants : undefined,
  };

  if (!slot.variants && item?.url) {
    slot.url = item.url;
    if (item.width != null) slot.width = item.width;
    if (item.height != null) slot.height = item.height;
  }

  return slot;
};

const ADMIN_IMAGE_PREFIX = '/api/images/';
const PUBLIC_IMAGE_PREFIX = '/images/';

export const toAdminImageUrl = (url) => {
  if (!url || typeof url !== 'string') return url || '';
  if (url.includes(ADMIN_IMAGE_PREFIX)) return url;

  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, 'http://admin.local');
    if (parsed.pathname.startsWith(PUBLIC_IMAGE_PREFIX)) {
      parsed.pathname = parsed.pathname.replace(PUBLIC_IMAGE_PREFIX, ADMIN_IMAGE_PREFIX);
      const isAbsolute = /^https?:\/\//i.test(trimmed);
      return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Fall through to original value
  }

  return trimmed;
};

export const toAdminSrcSet = (srcSet) => {
  if (!srcSet || typeof srcSet !== 'string') return srcSet || '';
  return srcSet
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return '';
      const [url, ...rest] = trimmed.split(/\s+/);
      const updatedUrl = toAdminImageUrl(url);
      return [updatedUrl, ...rest].join(' ');
    })
    .filter(Boolean)
    .join(', ');
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
  parseVariantsJson,
  buildImageSlotFromMedia,
};
