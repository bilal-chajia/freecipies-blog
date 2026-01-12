globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { u as updateTag, d as deleteTag } from '../../../chunks/tags.service_BG2nrB-b.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_D-Ec29oM.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const getTagBySlug = async (db, slug) => {
  const { results } = await db.prepare("SELECT * FROM tags WHERE slug = ?").bind(slug).all();
  if (results.length === 0) return null;
  return {
    id: results[0].id,
    slug: results[0].slug,
    label: results[0].label,
    // ... map other fields if needed, but for now let's just return the raw object or map it properly
    // actually I should use the mapper from db.ts but it's not exported.
    // I'll just return the result and hope the frontend handles it or I'll duplicate the mapper logic slightly.
    // The frontend expects specific fields.
    // Let's just use the same structure as getTags.
    ...results[0],
    isOnline: Boolean(results[0].is_online),
    isFavorite: Boolean(results[0].is_favorite),
    createdAt: results[0].created_at,
    updatedAt: results[0].updated_at,
    route: `/tags/${results[0].slug}`
  };
};
const GET = async ({ request, params, locals }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const tag = await getTagBySlug(db, slug);
    if (!tag) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Tag not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse(tag, {
      cacheControl: "public, max-age=3600"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching tag:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch tag",
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
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const body = await request.json();
    const tag = await updateTag(env.DB, slug, body);
    if (!tag) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Tag not found", 404)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const { body: respBody, status, headers } = formatSuccessResponse(tag);
    return new Response(respBody, { status, headers });
  } catch (error) {
    console.error("Error updating tag:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update tag", 500)
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
    const success = await deleteTag(env.DB, slug);
    if (!success) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Tag not found or failed to delete", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting tag:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete tag", 500)
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
