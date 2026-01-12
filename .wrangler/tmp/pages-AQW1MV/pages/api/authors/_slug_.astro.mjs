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

import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { g as getAuthorBySlug, u as updateAuthor, d as deleteAuthor } from '../../../chunks/authors.service_DDYOeshw.mjs';
import { transformAuthorResponse, transformAuthorRequestBody } from '../../../chunks/index_CjdOo55e.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const getAvatarUrlFromImagesJson = (value) => {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const avatar = parsed?.avatar;
    if (!avatar) return null;
    if (avatar.variants && typeof avatar.variants === "object") {
      const variant = avatar.variants.lg || avatar.variants.md || avatar.variants.sm || avatar.variants.original || avatar.variants.xs;
      return variant?.url || null;
    }
    return avatar.url || null;
  } catch {
    return null;
  }
};
const GET = async ({ request, params, locals }) => {
  const { slug } = params;
  console.log(`[DEBUG] GET /api/authors/[slug] called with slug: "${slug}"`);
  if (!slug) {
    console.log("[DEBUG] Slug is missing");
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug or ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    console.log("[DEBUG] Connecting to DB...");
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const isNumeric = /^\d+$/.test(slug);
    let author;
    if (isNumeric) {
      const { getAuthorById } = await import('../../../chunks/index_CjdOo55e.mjs');
      author = await getAuthorById(db, parseInt(slug));
    } else {
      author = await getAuthorBySlug(db, slug);
    }
    if (!author) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Author not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const responseAuthor = transformAuthorResponse(author);
    const { body, status, headers } = formatSuccessResponse(responseAuthor, {
      cacheControl: "no-cache, no-store, must-revalidate"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching author:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch author",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ request, params, locals }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug or ID is required", 400)
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
    const body = await request.json();
    const transformedBody = transformAuthorRequestBody(body);
    const isNumeric = /^\d+$/.test(slug);
    let author;
    let existingAuthor;
    if (isNumeric) {
      const { getAuthorById, updateAuthorById } = await import('../../../chunks/index_CjdOo55e.mjs');
      existingAuthor = await getAuthorById(env.DB, parseInt(slug));
      const oldImageUrl = getAvatarUrlFromImagesJson(existingAuthor?.imagesJson);
      const shouldCheckImage = transformedBody.imagesJson !== void 0;
      const newImageUrl = shouldCheckImage ? getAvatarUrlFromImagesJson(transformedBody.imagesJson) : null;
      if (shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl && env.IMAGES) {
        try {
          const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
          if (keyMatch) {
            const oldKey = keyMatch[1];
            await env.IMAGES.delete(oldKey);
            await env.DB.prepare("DELETE FROM media WHERE r2_key = ?").bind(oldKey).run();
          }
        } catch (deleteErr) {
          console.warn("Failed to delete old author image:", deleteErr);
        }
      }
      author = await updateAuthorById(env.DB, parseInt(slug), transformedBody);
    } else {
      existingAuthor = await getAuthorBySlug(env.DB, slug);
      const oldImageUrl = getAvatarUrlFromImagesJson(existingAuthor?.imagesJson);
      const shouldCheckImage = transformedBody.imagesJson !== void 0;
      const newImageUrl = shouldCheckImage ? getAvatarUrlFromImagesJson(transformedBody.imagesJson) : null;
      if (shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl && env.IMAGES) {
        try {
          const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
          if (keyMatch) {
            const oldKey = keyMatch[1];
            await env.IMAGES.delete(oldKey);
            await env.DB.prepare("DELETE FROM media WHERE r2_key = ?").bind(oldKey).run();
          }
        } catch (deleteErr) {
          console.warn("Failed to delete old author image:", deleteErr);
        }
      }
      author = await updateAuthor(env.DB, slug, transformedBody);
    }
    if (!author) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Author not found", 404)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const responseAuthor = transformAuthorResponse(author);
    const { body: respBody, status, headers } = formatSuccessResponse(responseAuthor);
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error("Error updating author:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update author", 500)
    );
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, params, locals }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug is required", 400)
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
    const success = await deleteAuthor(env.DB, slug);
    if (!success) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Author not found or failed to delete", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting author:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete author", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    PUT,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
