/**
 * Rate limiting implementation for API endpoints
 * Uses in-memory store with sliding window algorithm
 * For production, consider using Cloudflare Durable Objects or external service
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory store for rate limit tracking
// In production, use Cloudflare Durable Objects or KV
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Default key generator - uses IP address from request
 */
function defaultKeyGenerator(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';
  return ip;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): RateLimitResult {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(request);
  const now = Date.now();

  // Get or initialize rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': '100', // Should be configurable
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Cleanup old entries from store (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Predefined rate limit configs
 */
export const RateLimitConfigs = {
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  MODERATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  RELAXED: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000,
  },
} as const;
