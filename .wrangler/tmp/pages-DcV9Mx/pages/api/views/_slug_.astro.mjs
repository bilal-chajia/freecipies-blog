globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getArticleBySlug, i as incrementViewCount } from '../../../chunks/articles.service_hseUetrK.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ params, locals }) => {
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
    const article = await getArticleBySlug(env.DB, slug);
    const { body, status, headers } = formatSuccessResponse({
      viewCount: article?.viewCount || 0
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching view count:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch view count", 500)
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ params, locals }) => {
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
    const success = await incrementViewCount(env.DB, slug);
    if (success) {
      const { body, status, headers } = formatSuccessResponse({ incremented: true });
      return new Response(body, { status, headers });
    } else {
      const { body, status, headers } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
      );
      return new Response(body, { status, headers });
    }
  } catch (error) {
    console.error("Error incrementing view count:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to increment view count", 500)
    );
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
