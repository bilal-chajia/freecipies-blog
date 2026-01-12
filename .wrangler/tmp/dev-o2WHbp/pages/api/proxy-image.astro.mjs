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

export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request }) => {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");
  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }
  try {
    const response = await fetch(imageUrl, {
      headers: {
        // Mimic a browser to avoid some bot protections
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!response.ok) {
      return new Response(`Failed to fetch image: ${response.status} ${response.statusText}`, { status: 502 });
    }
    const body = response.body;
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        // Enable CORS for local/remote usage
        "Cache-Control": "public, max-age=3600"
        // Cache for 1 hour
      }
    });
  } catch (e) {
    return new Response(`Error proxying image: ${e instanceof Error ? e.message : "Unknown error"}`, { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
