globalThis.process ??= {}; globalThis.process.env ??= {};
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_D-Ec29oM.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get("article_id");
    if (!articleId) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "article_id is required", 400)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const { results } = await env.DB.prepare(`
      SELECT * FROM pinterest_pins 
      WHERE article_id = ? 
      ORDER BY is_primary DESC, sort_order ASC
    `).bind(articleId).all();
    const { body, status, headers } = formatSuccessResponse({ pins: results });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching pins:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch pins", 500)
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
    const { article_id, board_id, title, description, image_url, image_alt, image_width, image_height, is_primary, sort_order } = body;
    if (!article_id || !title || !description || !image_url) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Missing required fields: article_id, title, description, image_url", 400)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    if (is_primary) {
      await env.DB.prepare(`
        UPDATE pinterest_pins SET is_primary = 0 WHERE article_id = ?
      `).bind(article_id).run();
    }
    const result = await env.DB.prepare(`
      INSERT INTO pinterest_pins 
      (article_id, board_id, title, description, image_url, image_alt, image_width, image_height, is_primary, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      article_id,
      board_id || null,
      title,
      description,
      image_url,
      image_alt || "",
      image_width || 1e3,
      image_height || 1500,
      is_primary ? 1 : 0,
      sort_order || 0
    ).run();
    const { body: respBody, status, headers } = formatSuccessResponse({
      id: result.meta.last_row_id
    });
    return new Response(respBody, { status: 201, headers });
  } catch (error) {
    console.error("Error creating pin:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create pin", 500)
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
    const { id, board_id, title, description, image_url, image_alt, image_width, image_height, is_primary, sort_order, pin_url } = body;
    if (!id) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.VALIDATION_ERROR, "Pin ID is required", 400)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const pin = await env.DB.prepare(`SELECT article_id FROM pinterest_pins WHERE id = ?`).bind(id).first();
    if (!pin) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Pin not found", 404)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    if (is_primary) {
      await env.DB.prepare(`
        UPDATE pinterest_pins SET is_primary = 0 WHERE article_id = ? AND id != ?
      `).bind(pin.article_id, id).run();
    }
    await env.DB.prepare(`
      UPDATE pinterest_pins 
      SET board_id = ?, title = ?, description = ?, image_url = ?, image_alt = ?, 
          image_width = ?, image_height = ?, is_primary = ?, sort_order = ?, pin_url = ?
      WHERE id = ?
    `).bind(
      board_id || null,
      title,
      description,
      image_url,
      image_alt,
      image_width,
      image_height,
      is_primary ? 1 : 0,
      sort_order,
      pin_url || null,
      id
    ).run();
    const { body: respBody, status, headers } = formatSuccessResponse({ updated: true });
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error("Error updating pin:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update pin", 500)
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
        new AppError(ErrorCodes.VALIDATION_ERROR, "Pin ID is required", 400)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    await env.DB.prepare(`DELETE FROM pinterest_pins WHERE id = ?`).bind(id).run();
    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting pin:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete pin", 500)
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
