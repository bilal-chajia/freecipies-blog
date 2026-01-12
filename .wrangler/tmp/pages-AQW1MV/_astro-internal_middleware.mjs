if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

import { d as defineMiddleware, s as sequence } from './chunks/index_DjxFTAWA.mjs';
import { MessageChannel } from 'node:worker_threads';
import './chunks/astro-designed-error-pages_B6wD2ieN.mjs';
import './chunks/astro/server_B79ahsw9.mjs';

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://localhost:4321", "SSR": true};
if (typeof globalThis.MessageChannel === "undefined") {
  globalThis.MessageChannel = MessageChannel;
}
const DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Origin",
  "User-Agent",
  "Referer"
].join(", ");
const DEFAULT_ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const buildAllowedOrigins = (origin) => {
  const origins = /* @__PURE__ */ new Set([origin]);
  const envOrigins = Object.assign(__vite_import_meta_env__, { OS: process.env.OS, PUBLIC: process.env.PUBLIC })?.PUBLIC_CORS_ORIGINS;
  if (envOrigins) {
    envOrigins.split(",").map((o) => o.trim()).filter(Boolean).forEach((o) => origins.add(o));
  }
  origins.add("http://localhost:4321");
  return origins;
};
const onRequest$2 = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const originHeader = request.headers.get("Origin");
  const allowedOrigins = buildAllowedOrigins(url.origin);
  const allowOrigin = originHeader && allowedOrigins.has(originHeader) ? originHeader : null;
  if (request.method === "OPTIONS" && originHeader) {
    const preflight = new Response(null, { status: 204 });
    if (allowOrigin) {
      preflight.headers.set("Access-Control-Allow-Origin", allowOrigin);
      preflight.headers.append("Vary", "Origin");
      preflight.headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS);
      preflight.headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
      preflight.headers.set("Access-Control-Max-Age", "86400");
    }
    return preflight;
  }
  const response = await next();
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
    "base-uri 'self'",
    "frame-ancestors 'self'"
  ].join("; ");
  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set("Content-Security-Policy", csp);
  }
  if (url.protocol === "https:" && !response.headers.has("Strict-Transport-Security")) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  if (!response.headers.has("X-Content-Type-Options")) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  if (!response.headers.has("Referrer-Policy")) {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  if (!response.headers.has("Permissions-Policy")) {
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=()");
  }
  if (!response.headers.has("Cross-Origin-Opener-Policy")) {
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  }
  if (!response.headers.has("Cross-Origin-Resource-Policy")) {
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  }
  if (allowOrigin && !response.headers.has("Access-Control-Allow-Origin")) {
    response.headers.set("Access-Control-Allow-Origin", allowOrigin);
    response.headers.append("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS);
    response.headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS);
  }
  return response;
});

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
