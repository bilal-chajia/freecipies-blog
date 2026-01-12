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

import { f as formatErrorResponse, A as AppError, E as ErrorCodes } from '../../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ params, locals, request }) => {
  const env = locals.runtime?.env;
  if (!env?.IMAGES) {
    const { body, status, headers: headers2 } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Storage not configured", 500)
    );
    return new Response(body, { status, headers: headers2 });
  }
  const pathParam = params.path;
  const key = Array.isArray(pathParam) ? pathParam.join("/") : pathParam;
  if (!key || key.includes("..")) {
    const { body, status, headers: headers2 } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid image path", 400)
    );
    return new Response(body, { status, headers: headers2 });
  }
  const ifNoneMatch = request.headers.get("If-None-Match");
  const object = await env.IMAGES.get(key);
  if (!object) {
    const { body, status, headers: headers2 } = formatErrorResponse(
      new AppError(ErrorCodes.NOT_FOUND, "Image not found", 404)
    );
    return new Response(body, { status, headers: headers2 });
  }
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304 });
  }
  const headers = new Headers();
  const metadata = object.httpMetadata;
  if (metadata?.contentType) {
    headers.set("Content-Type", metadata.contentType);
  }
  if (metadata?.contentDisposition) {
    headers.set("Content-Disposition", metadata.contentDisposition);
  }
  if (metadata?.cacheControl) {
    headers.set("Cache-Control", metadata.cacheControl);
  } else {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  if (metadata?.contentEncoding) {
    headers.set("Content-Encoding", metadata.contentEncoding);
  }
  if (metadata?.contentLanguage) {
    headers.set("Content-Language", metadata.contentLanguage);
  }
  if (!headers.get("Content-Type")) {
    headers.set("Content-Type", "application/octet-stream");
  }
  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }
  headers.set("Accept-Ranges", "bytes");
  return new Response(object.body, { status: 200, headers });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
