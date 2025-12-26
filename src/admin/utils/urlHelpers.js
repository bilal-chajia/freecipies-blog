/**
 * URL Helper Utilities
 * 
 * Common utilities for handling object URLs and memory cleanup.
 */

/**
 * Safely revoke an object URL
 * Prevents errors when revoking null/undefined or already-revoked URLs
 * @param {string|null|undefined} url - The object URL to revoke
 */
export const safeRevokeObjectURL = (url) => {
  try {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    // Silently ignore cleanup errors
    console.debug('URL.revokeObjectURL failed:', error);
  }
};

/**
 * Create an object URL and track it for cleanup
 * @param {Blob|File} blob - The blob to create URL for
 * @param {Set} urlTracker - Set to track created URLs
 * @returns {string} The created object URL
 */
export const createTrackedObjectURL = (blob, urlTracker) => {
  const url = URL.createObjectURL(blob);
  if (urlTracker instanceof Set) {
    urlTracker.add(url);
  }
  return url;
};

/**
 * Revoke all tracked object URLs and clear the tracker
 * @param {Set} urlTracker - Set of URLs to revoke
 */
export const revokeAllTrackedURLs = (urlTracker) => {
  if (!(urlTracker instanceof Set)) return;
  
  urlTracker.forEach(url => safeRevokeObjectURL(url));
  urlTracker.clear();
};
