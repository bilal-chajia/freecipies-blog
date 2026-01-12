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

import { v as verifyAuthToken } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env || {};
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    if (!jwtSecret) ;
    const authHeader = request.headers.get("Authorization");
    const token = await verifyAuthToken(authHeader, jwtSecret);
    if (!token) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      valid: true,
      user: {
        username: token.sub,
        role: token.role
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Verification failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
