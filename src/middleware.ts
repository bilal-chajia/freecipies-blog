import { defineMiddleware } from 'astro/middleware';
import { MessageChannel } from 'node:worker_threads';

// Polyfill MessageChannel synchronously if possible
if (typeof globalThis.MessageChannel === 'undefined') {
    (globalThis as any).MessageChannel = MessageChannel;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  
  // Content Security Policy
  // Allows 'unsafe-eval' to fix libraries using eval/new Function (e.g., some dev tools, extensive libs)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https: blob:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' wss: ws: https:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ');

  response.headers.set("Content-Security-Policy", csp);
  
  return response;
});
