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

import { a as getMedia } from '../../chunks/media.service_BzvilGys.mjs';
import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { e as extractAuthContext, c as createAuthError, h as hasRole, A as AuthRoles } from '../../chunks/auth.service_GsDnjv--.mjs';
import { a as formatSuccessResponse, f as formatErrorResponse, A as AppError, E as ErrorCodes } from '../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals, url }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!authContext.isAuthenticated) {
      return createAuthError("Unauthorized", 401);
    }
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const type = url.searchParams.get("type") || void 0;
    const search = url.searchParams.get("search") || void 0;
    const sortBy = url.searchParams.get("sortBy") || void 0;
    const order = url.searchParams.get("order") || "desc";
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const mediaFiles = await getMedia(env.DB, {
      type,
      search,
      sortBy,
      order,
      limit,
      offset
    });
    const enhancedMediaFiles = mediaFiles.map((file) => {
      let url2 = file.url || "";
      if (!url2 && file.variantsJson) {
        try {
          const parsed = typeof file.variantsJson === "string" ? JSON.parse(file.variantsJson) : file.variantsJson;
          const variants = parsed.variants || parsed;
          url2 = variants.original?.url || variants.lg?.url || variants.md?.url || variants.sm?.url || variants.public?.url || "";
        } catch (e) {
          console.warn(`Failed to parse variantsJson for media ${file.id}`);
        }
      }
      return {
        ...file,
        url: url2
      };
    });
    const { body, status, headers } = formatSuccessResponse(enhancedMediaFiles);
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching media:", error);
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch media", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
