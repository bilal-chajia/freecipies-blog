globalThis.process ??= {}; globalThis.process.env ??= {};
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../../chunks/error-handler_CIGPYhyT.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
    const result = await db.prepare(`
      SELECT 
        r.id,
        r.slug,
        r.headline as label,
        r.type,
        r.images_json,
        r.view_count,
        c.label as category_label,
        c.slug as category_slug
      FROM articles r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.is_online = 1
      ORDER BY r.view_count DESC, r.created_at DESC
      LIMIT ?1
    `).bind(limit).all();
    const articles = (result.results || []).map((a) => {
      let imageUrl = "";
      try {
        const images = a.images_json ? JSON.parse(a.images_json) : {};
        imageUrl = images?.cover?.variants?.md?.url || images?.cover?.variants?.sm?.url || "";
      } catch {
      }
      return {
        id: a.id,
        slug: a.slug,
        title: a.label,
        type: a.type,
        imageUrl,
        views: a.view_count || 0,
        category: a.category_label,
        categorySlug: a.category_slug
      };
    });
    const { body, status, headers } = formatSuccessResponse(articles, {
      cacheControl: "no-cache, no-store, must-revalidate"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching popular articles:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, error.message || "Failed to fetch popular articles", 500)
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
