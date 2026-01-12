globalThis.process ??= {}; globalThis.process.env ??= {};
import { v as verifyAuthToken } from '../../../chunks/auth.service_D-Ec29oM.mjs';
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
