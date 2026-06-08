import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { settingsAPI } from '../services/api';
import {
  IMAGE_UPLOAD_DEFAULTS as DEFAULTS,
  IMAGE_SETTINGS_CACHE_KEY as CACHE_KEY,
  IMAGE_SETTINGS_CACHE_TTL as CACHE_TTL,
  type ImageUploadSettings
} from '../../shared/constants/image-upload';

const DEBUG = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
const debugLog = (..._args: unknown[]) => {
  if (DEBUG) {
    // console.log(...args);
  }
};
const debugWarn = (...args: unknown[]) => {
  if (DEBUG) {
    console.warn(...args);
  }
};

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}


interface ApiResponse {
  success?: boolean;
  data?: unknown;
  [key: string]: unknown;
}

function normalizeSettings(payload: unknown): ImageUploadSettings | null {
  let current: unknown = payload;
  let depth = 0;

  while (current && typeof current === 'object' && depth < 4) {
    const obj = current as Record<string, unknown>;
    if ('max_file_size_mb' in obj && 'variant_widths' in obj && 'encoding' in obj) {
      return current as ImageUploadSettings;
    }
    if ('success' in obj && 'data' in obj) {
      current = obj.data;
      depth += 1;
      continue;
    }
    break;
  }

  return null;
}

function createAbortError(): Error {
  try {
    return new DOMException('Aborted', 'AbortError');
  } catch {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
  }
}

interface FetchState {
  controller: AbortController;
  promise: Promise<ImageUploadSettings | null>;
  subscribers: number;
  done: boolean;
}

let inFlightFetch: FetchState | null = null;

/**
 * Get cached settings from localStorage
 */
function getCachedSettings(): ImageUploadSettings | null {
  if (!hasLocalStorage()) return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as { data: unknown; timestamp: number };
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
function setCachedSettings(data: ImageUploadSettings): void {
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
function clearCache(): void {
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
function extractSettings(response: unknown): ImageUploadSettings | null {
  if (!response) return null;
  const apiResponse = response as ApiResponse;
  return (
    normalizeSettings(apiResponse?.data) ||
    normalizeSettings((apiResponse?.data as ApiResponse)?.data) ||
    normalizeSettings(response)
  );
}

function releaseSubscriber(fetchState: FetchState): void {
  fetchState.subscribers = Math.max(0, fetchState.subscribers - 1);
  if (fetchState.subscribers === 0 && !fetchState.done) {
    fetchState.controller.abort();
  }
}

function attachSubscriber(fetchState: FetchState, signal?: AbortSignal): Promise<ImageUploadSettings | null> {
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
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        releaseOnce();
        reject(err);
      }
    );
  });
}

function createFetchState(): FetchState {
  const controller = new AbortController();
  const fetchState: FetchState = {
    controller,
    promise: Promise.resolve(null),
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

function fetchSettingsFromApi({ signal }: { signal?: AbortSignal } = {}): Promise<ImageUploadSettings | null> {
  if (!inFlightFetch) {
    inFlightFetch = createFetchState();
  }

  return attachSubscriber(inFlightFetch, signal);
}

interface FetchAndUpdateOptions {
  preferCache?: boolean;
  silent?: boolean;
  fallbackToDefaults?: boolean;
}

interface UseImageUploadSettingsReturn {
  settings: ImageUploadSettings;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<ImageUploadSettings>) => Promise<ImageUploadSettings | undefined>;
  resetSettings: () => Promise<ImageUploadSettings | undefined>;
  refreshSettings: () => Promise<ImageUploadSettings | null>;
  defaults: ImageUploadSettings;
}

/**
 * React hook for image upload settings with localStorage cache
 */
export function useImageUploadSettings(): UseImageUploadSettingsReturn {
  const initialCached = useMemo(() => getCachedSettings(), []);
  const [settings, setSettings] = useState<ImageUploadSettings>(initialCached ?? DEFAULTS as ImageUploadSettings);
  const [isLoading, setIsLoading] = useState(!initialCached);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);

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
  }: FetchAndUpdateOptions = {}) => {
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
        setSettings(DEFAULTS as ImageUploadSettings);
      }
      return data;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.message === 'canceled') {
        return null;
      }
      console.error('Failed to fetch image upload settings:', e);
      if (mountedRef.current && requestId === requestIdRef.current && !silent) {
        setError(err);
        if (fallbackToDefaults) {
          setSettings(DEFAULTS as ImageUploadSettings);
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
  const updateSettings = useCallback(async (updates: Partial<ImageUploadSettings>) => {
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
    } catch (e: unknown) {
      console.error('[useImageUploadSettings] Error:', e);
      const err = e instanceof Error ? e : new Error(String(e));
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(err);
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
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(err);
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
    defaults: DEFAULTS as ImageUploadSettings,
  };
}

export default useImageUploadSettings;
