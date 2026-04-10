import { defineMiddleware } from 'astro/middleware';
import { env } from 'cloudflare:workers';
import { getRedirectByFromPath, incrementHitCount } from '@modules/redirects';

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
  'User-Agent',
  'Referer',
].join(', ');

const DEFAULT_ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

const buildAllowedOrigins = (origin: string) => {
  const origins = new Set<string>([origin]);
  const envOrigins = (import.meta as any).env?.PUBLIC_CORS_ORIGINS as string | undefined;
  if (envOrigins) {
    envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => origins.add(o));
  }

  // Allow default dev Astro port
  origins.add('http://localhost:4321');
  return origins;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const originHeader = request.headers.get('Origin');
  const allowedOrigins = buildAllowedOrigins(url.origin);
  const allowOrigin = originHeader && allowedOrigins.has(originHeader) ? originHeader : null;

  // Handle CORS preflight early
  if (request.method === 'OPTIONS' && originHeader) {
    const preflight = new Response(null, { status: 204 });
    if (allowOrigin) {
      preflight.headers.set('Access-Control-Allow-Origin', allowOrigin);
      preflight.headers.append('Vary', 'Origin');
      preflight.headers.set('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS);
      preflight.headers.set('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS);
      preflight.headers.set('Access-Control-Max-Age', '86400');
    }
    return preflight;
  }

  // 1. Check for database redirects
  // Skip API, Admin, and system paths
  const isSystemPath = url.pathname.startsWith('/api') || 
                       url.pathname.startsWith('/admin') || 
                       url.pathname.startsWith('/_') ||
                       url.pathname.includes('.'); // Skip static files with extensions

  if (!isSystemPath && env?.DB) {
    try {
      const redirect = await getRedirectByFromPath(env.DB, url.pathname);
      
      if (redirect && redirect.isActive) {
        // Schedule hit count update in the background via waitUntil().
        // The redirect is sent immediately; the D1 write completes after.
        // This avoids floating promises (which corrupt env.DB under
        // the no_handle_cross_request_promise_resolution flag).
        context.locals.cfContext?.waitUntil(
          incrementHitCount(env.DB, redirect.id)
        );
        
        return context.redirect(redirect.toPath, (redirect.statusCode || 301) as any);
      }
    } catch (err) {
      console.error('Middleware redirect error:', err);
    }
  }

  const response = await next();
  
  // Content Security Policy
  // Allows 'unsafe-eval' to fix libraries using eval/new Function (e.g., some dev tools, extensive libs)
  const isDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  const csp = isDev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https: blob: data: http://localhost:* http://127.0.0.1:*",
        "style-src 'self' 'unsafe-inline' https: http://localhost:* http://127.0.0.1:*",
        "img-src 'self' data: https: blob: http://localhost:* http://127.0.0.1:*",
        "font-src 'self' data: https: http://localhost:* http://127.0.0.1:*",
        "connect-src 'self' wss: ws: https: http://localhost:* http://127.0.0.1:*",
        "worker-src 'self' blob:",
        "frame-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https:",
        "worker-src 'self' blob:",
        "frame-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
      ].join('; ');

  // Apply CSP only if not already set by a route
  if (!response.headers.has('Content-Security-Policy')) {
    response.headers.set("Content-Security-Policy", csp);
  }

  // Additional security headers
  if (url.protocol === 'https:' && !response.headers.has('Strict-Transport-Security')) {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  if (!response.headers.has('X-Content-Type-Options')) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  }
  if (!response.headers.has('Referrer-Policy')) {
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  if (!response.headers.has('Permissions-Policy')) {
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  }
  if (!response.headers.has('Cross-Origin-Opener-Policy')) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  }
  if (!response.headers.has('Cross-Origin-Resource-Policy')) {
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  }

  // Default CORS headers (non-preflight)
  if (allowOrigin && !response.headers.has('Access-Control-Allow-Origin')) {
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
    response.headers.append('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS);
    response.headers.set('Access-Control-Allow-Headers', DEFAULT_ALLOWED_HEADERS);
  }
  
  return response;
});
