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

import { A as AppError, E as ErrorCodes, f as formatErrorResponse, a as formatSuccessResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    if (slug) {
      const board = await env.DB.prepare(`
        SELECT * FROM pinterest_boards WHERE slug = ?
      `).bind(slug).first();
      if (!board) {
        const { body: body3, status: status3, headers: headers3 } = formatErrorResponse(
          new AppError(ErrorCodes.NOT_FOUND, "Board not found", 404)
        );
        return new Response(body3, { status: status3, headers: headers3 });
      }
      const { body: body2, status: status2, headers: headers2 } = formatSuccessResponse({ board });
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { results } = await env.DB.prepare(`
      SELECT * FROM pinterest_boards 
      WHERE is_active = 1 
      ORDER BY name ASC
    `).all();
    const { body, status, headers } = formatSuccessResponse({ boards: results });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching boards:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch boards", 500)
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const body = await request.json();
    const { slug, name, description, board_url } = body;
    if (!slug || !name) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Missing required fields: slug, name", 400)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const result = await env.DB.prepare(`
      INSERT INTO pinterest_boards (slug, name, description, board_url)
      VALUES (?, ?, ?, ?)
    `).bind(slug, name, description || "", board_url || "").run();
    const { body: respBody, status, headers } = formatSuccessResponse({
      id: result.meta.last_row_id
    });
    return new Response(respBody, { status: 201, headers });
  } catch (error) {
    console.error("Error creating board:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create board", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const body = await request.json();
    const { id, slug, name, description, board_url, is_active } = body;
    if (!id) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Board ID is required", 400)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    await env.DB.prepare(`
      UPDATE pinterest_boards 
      SET slug = ?, name = ?, description = ?, board_url = ?, is_active = ?
      WHERE id = ?
    `).bind(slug, name, description, board_url, is_active ? 1 : 0, id).run();
    const { body: respBody, status, headers } = formatSuccessResponse({ updated: true });
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error("Error updating board:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update board", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env?.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Board ID is required", 400)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    await env.DB.prepare(`DELETE FROM pinterest_boards WHERE id = ?`).bind(id).run();
    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting board:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete board", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  GET,
  POST,
  PUT,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
