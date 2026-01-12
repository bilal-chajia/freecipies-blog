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

import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { a as getAuthors, c as createAuthor } from '../../chunks/authors.service_DDYOeshw.mjs';
import { transformAuthorResponse, transformAuthorRequestBody } from '../../chunks/index_CjdOo55e.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ url, locals }) => {
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const isOnlineParam = url.searchParams.get("isOnline");
    const options = isOnlineParam !== null ? { isOnline: isOnlineParam === "true" } : void 0;
    const authors = await getAuthors(env.DB, options);
    const responseAuthors = authors.map(transformAuthorResponse);
    const { body, status, headers } = formatSuccessResponse(responseAuthors, {
      cacheControl: "no-cache, no-store, must-revalidate"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching authors:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch authors", 500)
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const body = await request.json();
    const transformedBody = transformAuthorRequestBody(body);
    if (!body.name || !body.slug || !body.email) {
      const { body: errBody, status, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Missing required fields: name, slug, email", 400)
      );
      return new Response(errBody, { status, headers: headers2 });
    }
    const author = await createAuthor(env.DB, transformedBody);
    const responseAuthor = transformAuthorResponse(author);
    if (!author) {
      const { body: errBody, status, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create author", 500)
      );
      return new Response(errBody, { status, headers: headers2 });
    }
    const { body: respBody, headers } = formatSuccessResponse(responseAuthor);
    return new Response(respBody, { status: 201, headers });
  } catch (error) {
    console.error("Error creating author:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create author", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    POST,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
