globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getAuthorBySlug, u as updateAuthor, d as deleteAuthor } from '../../../chunks/authors.service_5yxqEIeb.mjs';
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
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const author = await getAuthorBySlug(db, slug);
    if (!author) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Author not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse(author, {
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
    const existingAuthor = await getAuthorBySlug(env.DB, slug);
    const oldImageUrl = existingAuthor?.imageUrl;
    const newImageUrl = body.imageUrl;
    if (oldImageUrl && (newImageUrl !== oldImageUrl || body.imageUrl === null)) {
      try {
        const keyMatch = oldImageUrl.match(/\/images\/(.+)$/);
        if (keyMatch && env.IMAGES) {
          const oldKey = keyMatch[1];
          console.log(`Deleting old author image with key: ${oldKey}`);
          await env.IMAGES.delete(oldKey);
          await env.DB.prepare("DELETE FROM media WHERE r2_key = ?").bind(oldKey).run();
          console.log(`Successfully deleted old author image: ${oldKey}`);
        }
      } catch (deleteErr) {
        console.warn("Failed to delete old author image:", deleteErr);
      }
    }
    const author = await updateAuthor(env.DB, slug, body);
    if (!author) {
      const { body: errBody, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Author not found", 404)
      );
      return new Response(errBody, { status: status2, headers: headers2 });
    }
    const { body: respBody, status, headers } = formatSuccessResponse(author);
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
