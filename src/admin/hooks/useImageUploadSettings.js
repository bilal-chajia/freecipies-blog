import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { settingsAPI } from '../services/api';
import {
  IMAGE_UPLOAD_DEFAULTS as DEFAULTS,
  IMAGE_SETTINGS_CACHE_KEY as CACHE_KEY,
  IMAGE_SETTINGS_CACHE_TTL as CACHE_TTL
} from '../../shared/constants/image-upload';

const DEBUG = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
const debugLog = (...args) => {
  if (DEBUG) {
    console.log(...args);
  }
};
const debugWarn = (...args) => {
  if (DEBUG) {
    console.warn(...args);
  }
};

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeSettings(payload) {
  let current = payload;
  let depth = 0;

  while (current && typeof current === 'object' && depth < 4) {
    if ('webpQuality' in current) {
      return current;
    }
    if ('success' in current && 'data' in current) {
      current = current.data;
      depth += 1;
      continue;
    }
    break;
  }

  return null;
}

function createAbortError() {
  try {
    return new DOMException('Aborted', 'AbortError');
  } catch {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
  }
}

let inFlightFetch = null;

/**
 * Get cached settings from localStorage
 */
function getCachedSettings() {
  if (!hasLocalStorage()) return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const { data, timestamp } = parsed;
    const isStale = Date.now() - timestamp > CACHE_TTL;

    if (isStale) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    const normalized = normalizeSettings(data);
    if (normalized) {
      if (normalized !== data) {
        debugWarn('[useImageUploadSettings] Found nested cache, normalizing data');
        setCachedSettings(normalized);
      }
      return normalized;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save settings to localStorage cache
 */
function setCachedSettings(data) {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    debugWarn('Failed to cache settings:', e);
  }
}

/**
 * Clear settings cache
 */
function clearCache() {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(CACHE_KEY);
    debugLog('[useImageUploadSettings] Cache cleared');
  } catch (e) {
    debugWarn('Failed to clear settings cache:', e);
  }
}

/**
 * Extract settings from API response (handles various response formats)
 */
function extractSettings(response) {
  if (!response) return null;
  return (
    normalizeSettings(response?.data) ||
    normalizeSettings(response?.data?.data) ||
    normalizeSettings(response)
  );
}

function releaseSubscriber(fetchState) {
  fetchState.subscribers = Math.max(0, fetchState.subscribers - 1);
  if (fetchState.subscribers === 0 && !fetchState.done) {
    fetchState.controller.abort();
  }
}

function attachSubscriber(fetchState, signal) {
  fetchState.subscribers += 1;
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    releaseSubscriber(fetchState);
  };

  if (!signal) {
    return fetchState.promise.finally(releaseOnce);
  }

  if (signal.aborted) {
    releaseOnce();
    return Promise.reject(createAbortError());
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      releaseOnce();
      reject(createAbortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });

    fetchState.promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        releaseOnce();
        resolve(value);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        releaseOnce();
        reject(err);
      }
    );
  });
}

function createFetchState() {
  const controller = new AbortController();
  const fetchState = {
    controller,
    promise: null,
    subscribers: 0,
    done: false,
  };

  fetchState.promise = settingsAPI
    .getImageUploadSettings({ signal: controller.signal })
    .then(extractSettings)
    .finally(() => {
      fetchState.done = true;
      if (inFlightFetch === fetchState) {
        inFlightFetch = null;
      }
    });

  return fetchState;
}

function fetchSettingsFromApi({ signal } = {}) {
  if (!inFlightFetch) {
    inFlightFetch = createFetchState();
  }

  return attachSubscriber(inFlightFetch, signal);
}

/**
 * React hook for image upload settings with localStorage cache
 */
export function useImageUploadSettings() {
  const initialCached = useMemo(() => getCachedSettings(), []);
  const [settings, setSettings] = useState(initialCached ?? DEFAULTS);
  const [isLoading, setIsLoading] = useState(!initialCached);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const fetchAbortRef = useRef(null);

  const abortFetch = useCallback(() => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
      fetchAbortRef.current = null;
    }
  }, []);

  const fetchAndUpdate = useCallback(async ({
    preferCache = true,
    silent = false,
    fallbackToDefaults = false,
  } = {}) => {
    const requestId = ++requestIdRef.current;

    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    if (preferCache) {
      const cached = getCachedSettings();
      if (cached) {
        debugLog('[useImageUploadSettings] Using cached settings:', cached);
        if (mountedRef.current && requestId === requestIdRef.current) {
          setSettings(cached);
          if (!silent) {
            setIsLoading(false);
          }
        }
        return cached;
      }
    }

    abortFetch();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const data = await fetchSettingsFromApi({ signal: controller.signal });

      if (mountedRef.current && requestId === requestIdRef.current && data) {
        debugLog('[useImageUploadSettings] Extracted settings:', data);
        setSettings(data);
        setCachedSettings(data);
        return data;
      }

      if (mountedRef.current && requestId === requestIdRef.current && fallbackToDefaults) {
        debugWarn('[useImageUploadSettings] Could not extract settings, using defaults');
        setSettings(DEFAULTS);
      }
      return data;
    } catch (e) {
      if (e?.name === 'AbortError') {
        return null;
      }
      console.error('Failed to fetch image upload settings:', e);
      if (mountedRef.current && requestId === requestIdRef.current && !silent) {
        setError(e);
        if (fallbackToDefaults) {
          setSettings(DEFAULTS);
        }
      }
      return null;
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current && !silent) {
        setIsLoading(false);
      }
    }
  }, [abortFetch]);

  // Fetch settings on mount
  useEffect(() => {
    mountedRef.current = true;

    if (initialCached) {
      fetchAndUpdate({ preferCache: false, silent: true });
    } else {
      fetchAndUpdate({ preferCache: true, silent: false, fallbackToDefaults: true });
    }

    return () => {
      mountedRef.current = false;
      abortFetch();
    };
  }, [abortFetch, fetchAndUpdate, initialCached]);

  // Update settings
  const updateSettings = useCallback(async (updates) => {
    const requestId = ++requestIdRef.current;
    debugLog('[useImageUploadSettings] updateSettings called with:', updates);
    abortFetch();
    setIsLoading(true);
    setError(null);

    // Clear cache before save to ensure we get fresh data
    clearCache();

    try {
      const response = await settingsAPI.updateImageUploadSettings(updates);
      const newSettings = extractSettings(response);

      if (newSettings && mountedRef.current && requestId === requestIdRef.current) {
        debugLog('[useImageUploadSettings] Extracted new settings:', newSettings);
        setSettings(newSettings);
        setCachedSettings(newSettings);
        return newSettings;
      }
      throw new Error('Failed to extract settings from response');
    } catch (e) {
      console.error('[useImageUploadSettings] Error:', e);
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(e);
      }
      throw e;
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [abortFetch]);

  // Reset to defaults
  const resetSettings = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortFetch();
    setIsLoading(true);
    setError(null);
    clearCache();

    try {
      const response = await settingsAPI.resetImageUploadSettings();
      const newSettings = extractSettings(response);

      if (newSettings && mountedRef.current && requestId === requestIdRef.current) {
        setSettings(newSettings);
        setCachedSettings(newSettings);
        return newSettings;
      }
      throw new Error('Failed to reset settings');
    } catch (e) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(e);
      }
      throw e;
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [abortFetch]);

  // Force refresh from server
  const refreshSettings = useCallback(async () => {
    return fetchAndUpdate({ preferCache: false, silent: false });
  }, [fetchAndUpdate]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    refreshSettings,
    defaults: DEFAULTS,
  };
}

export default useImageUploadSettings;
