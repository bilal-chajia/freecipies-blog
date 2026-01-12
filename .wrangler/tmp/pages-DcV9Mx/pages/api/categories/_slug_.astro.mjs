globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getCategoryBySlug, u as updateCategory, d as deleteCategory } from '../../../chunks/categories.service_DP4au7sC.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_D-Ec29oM.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ request, params, locals }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const category = await getCategoryBySlug(db, slug);
    if (!category) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Category not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse(category, {
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
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug is required", 400)
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
    const existingCategory = await getCategoryBySlug(env.DB, slug);
    const oldImageUrl = existingCategory?.imageUrl;
    const newImageUrl = body.imageUrl;
    console.log("Image update check:", {
      oldImageUrl,
      newImageUrl,
      bodyImageUrl: body.imageUrl,
      bodyImageUrlIsNull: body.imageUrl === null,
      bodyImageUrlIsUndefined: body.imageUrl === void 0,
      shouldDelete: oldImageUrl && (newImageUrl !== oldImageUrl || body.imageUrl === null)
    });
    if (oldImageUrl && (newImageUrl !== oldImageUrl || body.imageUrl === null)) {
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
    const category = await updateCategory(env.DB, slug, body);
    if (!category) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Category not found", 404)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const { body: respBody, status, headers } = formatSuccessResponse(category);
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error("Error updating category:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update category", 500)
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
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const success = await deleteCategory(env.DB, slug);
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
