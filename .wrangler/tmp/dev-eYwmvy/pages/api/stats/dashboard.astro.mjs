globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../../chunks/pinterest.schema_DDOHgYvi.mjs';
import '../../../chunks/templates.schema_DniFYo8s.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../../chunks/auth.service_D-Ec29oM.mjs';
export { renderers } from '../../../renderers.mjs';

async function getDashboardStats(db) {
  const result = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL) as articles,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL) as categories,
      (SELECT COUNT(*) FROM authors WHERE deleted_at IS NULL) as authors,
      (SELECT COUNT(*) FROM tags WHERE deleted_at IS NULL) as tags,
      (SELECT COALESCE(SUM(view_count), 0) FROM articles WHERE deleted_at IS NULL) as total_views
  `).first();
  return {
    articles: result?.articles || 0,
    categories: result?.categories || 0,
    authors: result?.authors || 0,
    tags: result?.tags || 0,
    totalViews: result?.total_views || 0
  };
}

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.VIEWER)) {
      return createAuthError("Insufficient permissions", 403);
    }
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const stats = await getDashboardStats(db);
    const { body, status, headers } = formatSuccessResponse(stats, {
      cacheControl: "private, max-age=60"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch dashboard stats",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
