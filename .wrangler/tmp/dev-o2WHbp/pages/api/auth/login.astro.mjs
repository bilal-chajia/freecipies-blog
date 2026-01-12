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

import { g as generateJWT, A as AuthRoles } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const POST = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { username, password } = body;
    const env = locals.runtime?.env || {};
    const adminUsername = env.ADMIN_USERNAME || "admin@freecipies.com";
    const adminPassword = env.ADMIN_PASSWORD || "admin123";
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    if (!adminUsername || !adminPassword || !jwtSecret) ;
    if (username !== adminUsername || password !== adminPassword) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const token = await generateJWT(
      { sub: username, role: AuthRoles.ADMIN },
      jwtSecret,
      "24h"
    );
    return new Response(JSON.stringify({
      token,
      user: {
        username,
        role: AuthRoles.ADMIN
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    POST,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
