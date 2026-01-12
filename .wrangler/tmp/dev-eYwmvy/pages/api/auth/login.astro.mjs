globalThis.process ??= {}; globalThis.process.env ??= {};
import { g as generateJWT, A as AuthRoles } from '../../../chunks/auth.service_D-Ec29oM.mjs';
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
