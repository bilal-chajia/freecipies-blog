/**
 * Caching strategy for API responses
 * Implements multi-layer caching: edge, browser, and application-level
 */

export interface CacheConfig {
  maxAge: number; // seconds
  sMaxAge?: number; // shared max age (CDN)
  staleWhileRevalidate?: number; // seconds
  staleIfError?: number; // seconds
  public?: boolean;
  private?: boolean;
}

export const CACHE_STRATEGIES = {
  // Static assets - cache forever
  STATIC: {
    maxAge: 31536000, // 1 year
    public: true,
  } as CacheConfig,

  // API responses - moderate caching
  API_DEFAULT: {
    maxAge: 3600, // 1 hour
    sMaxAge: 3600,
    staleWhileRevalidate: 86400, // 1 day
    public: true,
  } as CacheConfig,

  // Frequently accessed data
  API_FREQUENT: {
    maxAge: 300, // 5 minutes
    sMaxAge: 300,
    staleWhileRevalidate: 3600, // 1 hour
    public: true,
  } as CacheConfig,

  // User-specific data
  API_PRIVATE: {
    maxAge: 60, // 1 minute
    private: true,
    staleWhileRevalidate: 300, // 5 minutes
  } as CacheConfig,

  // No cache
  NO_CACHE: {
    maxAge: 0,
    private: true,
  } as CacheConfig,
} as const;

/**
 * Generate Cache-Control header value
 */
export function generateCacheControl(config: CacheConfig): string {
  const directives: string[] = [];

  if (config.public) directives.push('public');
  if (config.private) directives.push('private');

  directives.push(`max-age=${config.maxAge}`);

  if (config.sMaxAge !== undefined) {
    directives.push(`s-maxage=${config.sMaxAge}`);
  }

  if (config.staleWhileRevalidate !== undefined) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  if (config.staleIfError !== undefined) {
    directives.push(`stale-if-error=${config.staleIfError}`);
  }

  return directives.join(', ');
}

/**
 * Generate cache key for storing responses
 */
export function generateCacheKey(
  endpoint: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  return `${endpoint}?${sortedParams}`;
}

/**
 * Check if response should be cached
 */
export function isCacheable(status: number): boolean {
  return status === 200 || status === 301 || status === 404;
}

/**
 * Get cache headers for response
 */
export function getCacheHeaders(strategy: CacheConfig): Record<string, string> {
  return {
    'Cache-Control': generateCacheControl(strategy),
  };
}
