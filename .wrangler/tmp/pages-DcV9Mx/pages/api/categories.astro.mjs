globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { a as getCategories, c as createCategory } from '../../chunks/categories.service_DP4au7sC.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_D-Ec29oM.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const categories = await getCategories(db);
    const { body, status, headers } = formatSuccessResponse(categories, {
      cacheControl: "no-cache, no-store, must-revalidate"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching categories:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch categories",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const reqBody = await request.json();
    const category = await createCategory(env.DB, reqBody);
    const { body, status, headers } = formatSuccessResponse(category);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error("Error creating category:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create category", 500)
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
