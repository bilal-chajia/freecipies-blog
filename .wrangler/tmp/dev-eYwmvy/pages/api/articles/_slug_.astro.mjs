globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getArticleBySlug, u as updateArticle, d as deleteArticle } from '../../../chunks/articles.service_hseUetrK.mjs';
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
    const article = await getArticleBySlug(db, slug);
    if (!article) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse(article, {
      cacheControl: "public, max-age=3600"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching article:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch article",
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
    const requestBody = await request.json();
    const transformedData = {
      ...requestBody,
      // Convert flat image fields to nested structure
      image: requestBody.imageUrl ? {
        url: requestBody.imageUrl,
        alt: requestBody.imageAlt || "",
        width: requestBody.imageWidth,
        height: requestBody.imageHeight
      } : requestBody.image,
      // Convert flat cover fields to nested structure  
      cover: requestBody.coverUrl ? {
        url: requestBody.coverUrl,
        alt: requestBody.coverAlt || "",
        width: requestBody.coverWidth,
        height: requestBody.coverHeight
      } : requestBody.cover
    };
    const jsonFields = ["contentJson", "recipeJson", "faqsJson", "keywordsJson", "referencesJson", "mediaJson"];
    for (const field of jsonFields) {
      if (typeof requestBody[field] === "string" && requestBody[field]) {
        try {
          transformedData[field] = JSON.parse(requestBody[field]);
        } catch (e) {
          transformedData[field] = requestBody[field];
        }
      }
    }
    if (requestBody.selectedTags && Array.isArray(requestBody.selectedTags)) {
      transformedData.tags = void 0;
    }
    const article = await updateArticle(env.DB, slug, transformedData);
    if (!article) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse(article);
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
    const success = await deleteArticle(env.DB, slug);
    if (!success) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found or failed to delete", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const { body, status, headers } = formatSuccessResponse({ deleted: true });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error deleting article:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to delete article", 500)
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
