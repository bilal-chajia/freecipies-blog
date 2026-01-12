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
import { e as getCategories, f as createCategory } from '../../chunks/categories.service_BzGDlPlq.mjs';
import { t as transformCategoryResponse, a as transformCategoryRequestBody } from '../../chunks/helpers_Dlog4nju.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const categories = await getCategories(db);
    const responseCategories = categories.map(transformCategoryResponse);
    const { body, status, headers } = formatSuccessResponse(responseCategories, {
      cacheControl: "no-cache, no-store, must-revalidate"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching categories:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch categories",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const reqBody = await request.json();
    const transformedBody = transformCategoryRequestBody(reqBody);
    const category = await createCategory(env.DB, transformedBody);
    const responseCategory = transformCategoryResponse(category);
    const { body, status, headers } = formatSuccessResponse(responseCategory);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error("Error creating category:", error);
    const appErr = error instanceof AppError ? error : error?.code === "VALIDATION_ERROR" ? new AppError(ErrorCodes.VALIDATION_ERROR, error.message, 400) : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create category", 500);
    const { body, status, headers } = formatErrorResponse(appErr);
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
