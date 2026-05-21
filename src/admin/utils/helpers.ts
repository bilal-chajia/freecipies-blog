import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Generate slug from string
 */
export const generateSlug = (str: string): string => {
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
export const truncate = (str: string | null | undefined, length = 100): string => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date | null | undefined, formatStr = 'MMM dd, yyyy'): string => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

// ============================================
// JSON UTILITIES
// ============================================

/**
 * Safely parse JSON string
 */
export const safeJSONParse = <T = unknown>(str: string, fallback: T | null = null): T | null => {
  try {
    return JSON.parse(str) as T;
  } catch {
    console.error('JSON parse error');
    return fallback;
  }
};

/**
 * Safely stringify JSON
 */
export const safeJSONStringify = (obj: unknown, pretty = false): string => {
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
export const isValidJSON = (str: string): boolean => {
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

interface VariantEntry {
  width?: number;
  height?: number;
  url: string;
  size_bytes?: number;
  sizeBytes?: number;
}

interface NormalizedVariant {
  width: number;
  height: number;
  url: string;
  size_bytes?: number;
}

export const parseVariantsJson = (value: string | object | null | undefined): object | null => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeVariantEntry = (variant: VariantEntry | null | undefined): NormalizedVariant | null => {
  if (!variant || typeof variant !== 'object') return null;
  if (!variant.url) return null;

  const result: NormalizedVariant = {
    width: variant.width ?? 0,
    height: variant.height ?? 0,
    url: variant.url,
  };

  const sizeBytes = variant.size_bytes ?? variant.sizeBytes;
  if (typeof sizeBytes === 'number') {
    result.size_bytes = sizeBytes;
  }

  return result;
};

const normalizeMediaVariants = (parsed: object | null | undefined): object | null => {
  if (!parsed || typeof parsed !== 'object') return null;
  if ((parsed as Record<string, unknown>).variants && typeof (parsed as Record<string, unknown>).variants === 'object') {
    return (parsed as Record<string, unknown>).variants as object;
  }
  return parsed;
};

interface MediaItem {
  id?: number;
  variantsJson?: string | object;
  variants_json?: string | object;
  variants?: object;
  altText?: string;
  alt?: string;
  placeholder?: string;
  aspectRatio?: string;
  aspect_ratio?: string;
  focalPointJson?: string | object;
  focal_point_json?: string | object;
}

interface ImageSlotOverrides {
  alt?: string;
  placeholder?: string;
  aspectRatio?: string;
  aspect_ratio?: string;
  focal_point?: string | object;
  variant_keys?: string[];
  media_id?: number;
}

interface FocalPoint {
  x: number;
  y: number;
}

interface ImageSlot {
  media_id: number | undefined;
  alt: string | undefined;
  placeholder: string | undefined;
  aspect_ratio: string | undefined;
  focal_point: FocalPoint | undefined;
  variants: Record<string, NormalizedVariant>;
}

export const buildImageSlotFromMedia = (item: MediaItem | null | undefined, overrides: ImageSlotOverrides = {}): ImageSlot => {
  const parsed = parseVariantsJson(item?.variantsJson || item?.variants_json);
  const payloadVariants = item?.variants && typeof item.variants === 'object'
    ? item.variants
    : null;
  const variantsSource = payloadVariants || parsed;
  const variantMap = normalizeMediaVariants(variantsSource);
  const allowedVariantKeys = Array.isArray(overrides.variant_keys)
    ? new Set(overrides.variant_keys)
    : new Set(['xs', 'sm', 'md', 'lg']);
  const variants: Record<string, NormalizedVariant> = {};

  if (variantMap && typeof variantMap === 'object') {
    Object.entries(variantMap).forEach(([key, variant]) => {
      if (!allowedVariantKeys.has(key)) return;
      const normalized = normalizeVariantEntry(variant as VariantEntry);
      if (normalized?.url) {
        variants[key] = normalized;
      }
    });
  }

  const alt = overrides.alt ?? item?.altText ?? item?.alt ?? '';
  const placeholder = (overrides.placeholder ?? (parsed as Record<string, unknown>)?.placeholder ?? item?.placeholder ?? '') as string;
  const aspectRatio = overrides.aspectRatio ?? item?.aspectRatio ?? item?.aspect_ratio;
  const focalPointRaw = overrides.focal_point ?? item?.focalPointJson ?? item?.focal_point_json;
  const focalPoint = ((): FocalPoint | undefined => {
    if (!focalPointRaw) return undefined;
    if (typeof focalPointRaw === 'object') return focalPointRaw as FocalPoint;
    try {
      return JSON.parse(focalPointRaw) as FocalPoint;
    } catch {
      return undefined;
    }
  })();

  const slot: ImageSlot = {
    media_id: item?.id ?? overrides.media_id,
    alt: alt || undefined,
    placeholder: placeholder || undefined,
    aspect_ratio: aspectRatio || undefined,
    focal_point: focalPoint,
    variants,
  };

  return slot;
};

const ADMIN_IMAGE_PREFIX = '/api/images/';
const PUBLIC_IMAGE_PREFIX = '/images/';

export const toAdminImageUrl = (url: string | null | undefined): string => {
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

export const toAdminSrcSet = (srcSet: string | null | undefined): string => {
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

interface ImageStyleInput {
  imageObjectPosition?: string;
  imageAspectRatio?: string;
}

export const buildImageStyle = (image: ImageStyleInput | null | undefined): Record<string, string> | undefined => {
  if (!image) return undefined;
  const style: Record<string, string> = {};

  if (image.imageObjectPosition) {
    style.objectPosition = image.imageObjectPosition;
  }

  if (image.imageAspectRatio) {
    style.aspectRatio = image.imageAspectRatio;
  }

  return Object.keys(style).length ? style : undefined;
};

// ============================================
// FILE UTILITIES
// ============================================

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension
 */
export const getFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return '';
  return filename.split('.').pop() || '';
};

/**
 * Check if file is image
 */
export const isImageFile = (filename: string): boolean => {
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
export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate URL
 */
export const isValidURL = (url: string): boolean => {
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
export const isValidSlug = (slug: string): boolean => {
  const re = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return re.test(slug);
};

// ============================================
// ARRAY UTILITIES
// ============================================

/**
 * Remove duplicates from array
 */
export const uniqueArray = <T>(arr: T[]): T[] => {
  return [...new Set(arr)];
};

interface SortableByKey {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Sort array of objects by key
 */
export const sortByKey = <T extends SortableByKey>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal == null) return order === 'asc' ? 1 : -1;
    if (bVal == null) return order === 'asc' ? -1 : 1;
    if (aVal === bVal) return 0;
    return order === 'asc'
      ? (aVal as any) > (bVal as any) ? 1 : -1
      : (aVal as any) < (bVal as any) ? 1 : -1;
  });
};

// ============================================
// OBJECT UTILITIES
// ============================================

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove empty values from object
 */
export const removeEmpty = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== '')
  ) as Partial<T>;
};

// ============================================
// NUMBER UTILITIES
// ============================================

/**
 * Format number with commas
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num == null || num === undefined || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Generate random ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Get status color
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
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
export const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    article: 'blue',
    recipe: 'orange',
  };
  return colors[type] || 'gray';
};

/**
 * Get contrast text color (black or white) for a given hex background
 */
export const getContrastColor = (hex: string | null | undefined): string => {
  if (!hex) return 'white';

  // Remove hash if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

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
export const copyToClipboard = async (text: string): Promise<boolean> => {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => void>(func: T, wait = 300): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
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
  getContrastColor,
  copyToClipboard,
  debounce,
  parseVariantsJson,
  buildImageSlotFromMedia,
  buildImageStyle,
};
