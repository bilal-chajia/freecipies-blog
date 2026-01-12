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

import { v as verifyAuthToken, g as generateJWT } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env || {};
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    if (!jwtSecret) ;
    const authHeader = request.headers.get("Authorization");
    const payload = await verifyAuthToken(authHeader, jwtSecret);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const token = await generateJWT(
      { sub: payload.sub, role: payload.role },
      jwtSecret,
      "24h"
    );
    return new Response(JSON.stringify({
      token,
      user: {
        username: payload.sub,
        role: payload.role
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return new Response(JSON.stringify({ error: "Failed to refresh session" }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    POST,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
