import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosPromise,
  type AxiosAdapter,
} from 'axios';
import { useAuthStore } from '../store/useStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 1000,
  retryableStatuses: [500, 502, 503, 504],
};

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  skipAdminCache?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  timeout: 30000,
});

// --- ADMIN LOCALSTORAGE CACHING LAYER ---

interface CacheRule {
  namespace: string;
  match: RegExp;
}

const CACHE_RULES: CacheRule[] = [
  { namespace: 'articles', match: /^\/articles/ },
  { namespace: 'articles', match: /^\/admin\/articles/ },
  { namespace: 'settings', match: /^\/(settings|branding)/ },
  { namespace: 'categories', match: /^\/categories/ },
  { namespace: 'tags', match: /^\/tags/ },
  { namespace: 'authors', match: /^\/authors/ },
  { namespace: 'equipment', match: /^\/equipment/ },
  { namespace: 'media', match: /^\/media/ },
  { namespace: 'pinterest-boards', match: /^\/pinterest-boards/ },
  { namespace: 'pins', match: /^\/pins/ },
  { namespace: 'stats', match: /^\/stats/ },
  { namespace: 'templates', match: /^\/templates/ },
  { namespace: 'ai', match: /^\/admin\/ai/ },
  { namespace: 'redirects', match: /^\/redirects/ },
];

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

const RELATED_INVALIDATIONS: Record<string, string[]> = {
  articles: ['articles', 'stats'],
  categories: ['categories', 'articles', 'stats'],
  tags: ['tags', 'articles', 'stats'],
  authors: ['authors', 'articles', 'media', 'stats'],
  equipment: ['equipment', 'articles'],
  media: ['media', 'articles', 'authors', 'categories'],
  'pinterest-boards': ['pinterest-boards', 'pins'],
  pins: ['pins', 'stats'],
  settings: ['settings'],
  templates: ['templates'],
  ai: ['ai'],
  redirects: ['redirects'],
};

const NAMESPACE_LOCAL_STORAGE_KEYS: Record<string, string[]> = {
  authors: ['media_credit_authors'],
  settings: ['image_upload_settings'],
};

interface AdminCacheEntry {
  value: unknown;
  expiry: number;
}

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeParams(params: unknown): Record<string, unknown> {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  return { ...(params as Record<string, unknown>) };
}

function getCacheKeyForRequest(namespace: string, url: string, params?: unknown): string {
  const cleanParams = normalizeParams(params);
  if (typeof cleanParams === 'object') {
    delete cleanParams._t;
  }
  const sortedParams = Object.keys(cleanParams)
    .sort()
    .reduce((acc, key) => {
      acc[key] = cleanParams[key];
      return acc;
    }, {} as Record<string, unknown>);

  return `admin_cache:${namespace}:${url}:${JSON.stringify(sortedParams)}`;
}

export function clearAllAdminCache(): void {
  if (!hasLocalStorage()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('admin_cache:') ||
          Object.values(NAMESPACE_LOCAL_STORAGE_KEYS).some((keys) => keys.includes(key)))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    // eslint-disable-next-line no-console
    console.log('[Cache] Wiped all admin cache keys');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Cache] Failed to clear localStorage cache:', e);
  }
}

function invalidateCacheNamespace(namespace: string): void {
  if (!hasLocalStorage()) return;
  try {
    const prefix = `admin_cache:${namespace}:`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.push(...(NAMESPACE_LOCAL_STORAGE_KEYS[namespace] ?? []));
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    // eslint-disable-next-line no-console
    console.log(`[Cache] Invalidated namespace: ${namespace}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[Cache] Failed to invalidate namespace ${namespace}:`, e);
  }
}

function handleMutationInvalidation(url: string): void {
  for (const rule of CACHE_RULES) {
    if (rule.match.test(url)) {
      const namespaces = RELATED_INVALIDATIONS[rule.namespace] ?? [rule.namespace];
      namespaces.forEach(invalidateCacheNamespace);
      return;
    }
  }
}

// Intercept Axios Adapter for caching
const transportAdapter = axios.getAdapter(api.defaults.adapter || axios.defaults.adapter) as AxiosAdapter;

api.defaults.adapter = async function (config: InternalAxiosRequestConfig): AxiosPromise {
  const url = config.url;
  const method = config.method ? config.method.toLowerCase() : '';
  const skipAdminCache = Boolean((config as CustomAxiosConfig).skipAdminCache);

  // 1. Intercept GET requests for caching
  if (!skipAdminCache && method === 'get' && url && hasLocalStorage()) {
    const rule = CACHE_RULES.find((r) => r.match.test(url));
    if (rule) {
      const cacheKey = getCacheKeyForRequest(rule.namespace, url, config.params);
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as AdminCacheEntry | null;
          if (parsed && typeof parsed.expiry === 'number' && parsed.expiry > Date.now()) {
            // eslint-disable-next-line no-console
            console.log(`[Cache Hit] Serving ${url} from localStorage`);
            return Promise.resolve({
              data: parsed.value,
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
              request: {},
            } as AxiosResponse);
          } else {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Cache] Error reading from localStorage:', e);
      }
    }
  }

  // 2. Perform actual server request
  const response = await transportAdapter(config);

  // 3. Save successful GET responses to cache
  if (!skipAdminCache && method === 'get' && url && response.status === 200 && hasLocalStorage()) {
    const rule = CACHE_RULES.find((r) => r.match.test(url));
    if (rule) {
      const cacheKey = getCacheKeyForRequest(rule.namespace, url, config.params);
      try {
        const cacheEntry = {
          value: response.data,
          expiry: Date.now() + DEFAULT_TTL_MS,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Cache] Error writing to localStorage:', e);
      }
    }
  }

  // 4. Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
  if (url && ['post', 'put', 'delete', 'patch'].includes(method)) {
    handleMutationInvalidation(url);
  }

  return response;
};

// --- INTERCEPTORS ---

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomAxiosConfig;
    const token = localStorage.getItem('admin_token');
    if (token) {
      customConfig.headers.Authorization = `Bearer ${token}`;
    }
    if (customConfig.method === 'get') {
      customConfig.params = {
        ...customConfig.params,
        _t: Date.now(),
      };
    }
    if (typeof customConfig._retryCount !== 'number') {
      customConfig._retryCount = 0;
    }
    return customConfig;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosConfig | undefined;

    if (error.response?.status === 401) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (useAuthStore.getState() as { clearAuth: () => void }).clearAuth();
      localStorage.removeItem('admin_token');
      clearAllAdminCache();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isRetryable = !status || RETRY_CONFIG.retryableStatuses.includes(status);
    const canRetry =
      config &&
      typeof config._retryCount === 'number' &&
      config._retryCount < RETRY_CONFIG.maxRetries &&
      isRetryable;

    if (canRetry) {
      (config as CustomAxiosConfig)._retryCount! += 1;
      const delay = RETRY_CONFIG.retryDelayMs * (config as CustomAxiosConfig)._retryCount!;
      // eslint-disable-next-line no-console
      console.warn(
        `[API] Retrying ${config.method?.toUpperCase()} ${config.url} (attempt ${config._retryCount}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
