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

import '../../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { g as getArticleById, u as updateArticleById, s as syncCachedFields, d as deleteArticleById, t as toggleOnlineById, a as toggleFavoriteById } from '../../../../chunks/articles.service_DgNeye45.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../../chunks/auth.service_GsDnjv--.mjs';
import { t as transformArticleRequestBody } from '../../../../chunks/helpers_NuS9JhFo.mjs';
export { renderers } from '../../../../renderers.mjs';

const prerender = false;
function parseArticleId(idParam) {
  if (!idParam) return null;
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
}
const GET = async ({ params, locals }) => {
  const id = parseArticleId(params.id);
  if (!id) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Valid numeric ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const article = await getArticleById(env.DB, id);
    if (!article) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse(article);
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching article by ID:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch article", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ request, params, locals }) => {
  const id = parseArticleId(params.id);
  if (!id) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Valid numeric ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const requestBody = await request.json();
    const transformedData = transformArticleRequestBody(requestBody);
    const success = await updateArticleById(env.DB, id, transformedData);
    if (!success) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    await syncCachedFields(env.DB, id);
    const updatedArticle = await getArticleById(env.DB, id);
    const { body, status, headers } = formatSuccessResponse(updatedArticle);
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error updating article:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update article", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, params, locals }) => {
  const id = parseArticleId(params.id);
  if (!id) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Valid numeric ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const success = await deleteArticleById(env.DB, id);
    if (!success) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found or already deleted", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({ deleted: true, id });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting article:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete article", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PATCH = async ({ request, params, locals }) => {
  const id = parseArticleId(params.id);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  if (!id) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Valid numeric ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  if (!action || !["toggle-online", "toggle-favorite"].includes(action)) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Valid action query param required: toggle-online or toggle-favorite", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    let result = null;
    if (action === "toggle-online") {
      result = await toggleOnlineById(env.DB, id);
    } else if (action === "toggle-favorite") {
      result = await toggleFavoriteById(env.DB, id);
    }
    if (!result) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    if (action === "toggle-online") {
      await syncCachedFields(env.DB, id);
    }
    const { body, status, headers } = formatSuccessResponse({ id, ...result });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error toggling article status:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to toggle article status", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    PATCH,
    PUT,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
