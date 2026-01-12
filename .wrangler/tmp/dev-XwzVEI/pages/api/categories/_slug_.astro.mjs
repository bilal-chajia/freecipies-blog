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
import { g as getCategoryById, a as getCategoryBySlug, u as updateCategoryById, b as updateCategory, d as deleteCategoryById, c as deleteCategory } from '../../../chunks/categories.service_BzGDlPlq.mjs';
import { t as transformCategoryResponse, a as transformCategoryRequestBody } from '../../../chunks/helpers_Dlog4nju.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_GsDnjv--.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const getThumbnailUrlFromImagesJson = (value) => {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const primarySlot = parsed?.thumbnail ?? parsed?.cover;
    if (!primarySlot) return null;
    if (primarySlot.variants && typeof primarySlot.variants === "object") {
      const variant = primarySlot.variants.lg || primarySlot.variants.md || primarySlot.variants.sm || primarySlot.variants.original || primarySlot.variants.xs;
      return variant?.url || null;
    }
    return primarySlot.url || null;
  } catch {
    return null;
  }
};
const GET = async ({ request, params, locals }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug or ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const isNumeric = /^\d+$/.test(slug);
    const category = isNumeric ? await getCategoryById(db, parseInt(slug, 10)) : await getCategoryBySlug(db, slug);
    if (!category) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Category not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const responseCategory = transformCategoryResponse(category);
    const { body, status, headers } = formatSuccessResponse(responseCategory, {
      cacheControl: "no-cache, no-store, must-revalidate"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching category:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch category",
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
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const body = await request.json();
    const transformedBody = transformCategoryRequestBody(body);
    console.log("Backend received iconSvg:", transformedBody.iconSvg ? transformedBody.iconSvg.substring(0, 50) : "NOT PRESENT");
    const isNumeric = /^\d+$/.test(slug);
    const existingCategory = isNumeric ? await getCategoryById(env.DB, parseInt(slug, 10)) : await getCategoryBySlug(env.DB, slug);
    const oldImageUrl = getThumbnailUrlFromImagesJson(existingCategory?.imagesJson);
    const shouldCheckImage = transformedBody.imagesJson !== void 0;
    const newImageUrl = shouldCheckImage ? getThumbnailUrlFromImagesJson(transformedBody.imagesJson) : null;
    console.log("Image update check:", {
      oldImageUrl,
      newImageUrl,
      bodyImagesJsonProvided: shouldCheckImage,
      shouldDelete: shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl
    });
    if (shouldCheckImage && oldImageUrl && newImageUrl !== oldImageUrl) {
      try {
        const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
        if (keyMatch && env.IMAGES) {
          const oldKey = keyMatch[1];
          console.log(`Deleting old category image with key: ${oldKey}`);
          await env.IMAGES.delete(oldKey);
          const deleteResult = await env.DB.prepare(
            "DELETE FROM media WHERE r2_key = ? OR url = ?"
          ).bind(oldKey, oldImageUrl).run();
          console.log(`Deleted category image. Key: ${oldKey}, Media rows affected: ${deleteResult.meta?.changes || 0}`);
        }
      } catch (deleteErr) {
        console.warn("Failed to delete old category image:", deleteErr);
      }
    }
    const category = isNumeric ? await updateCategoryById(env.DB, parseInt(slug, 10), transformedBody) : await updateCategory(env.DB, slug, transformedBody);
    if (!category) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Category not found", 404)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const responseCategory = transformCategoryResponse(category);
    const { body: respBody, status, headers } = formatSuccessResponse(responseCategory);
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error("Error updating category:", error);
    const appErr = error instanceof AppError ? error : error?.code === "VALIDATION_ERROR" ? new AppError(ErrorCodes.VALIDATION_ERROR, error.message, 400) : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update category", 500);
    const { body, status, headers } = formatErrorResponse(appErr);
    return new Response(body, { status, headers });
  }
};
const DELETE = async ({ request, params, locals }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug or ID is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const isNumeric = /^\d+$/.test(slug);
    const success = isNumeric ? await deleteCategoryById(env.DB, parseInt(slug, 10)) : await deleteCategory(env.DB, slug);
    if (!success) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Category not found or failed to delete", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting category:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete category", 500)
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
