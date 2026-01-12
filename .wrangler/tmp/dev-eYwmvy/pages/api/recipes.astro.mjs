globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getArticleBySlug, a as getArticles } from '../../chunks/articles.service_hseUetrK.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const category = url.searchParams.get("category");
  const author = url.searchParams.get("author");
  const limit = parseInt(url.searchParams.get("limit") || "12");
  const page = parseInt(url.searchParams.get("page") || "1");
  const offset = (page - 1) * limit;
  try {
    const env = locals.runtime.env;
    const db = env.DB;
    if (slug) {
      const recipe = await getArticleBySlug(db, slug, "recipe");
      if (!recipe) {
        return new Response(JSON.stringify({
          success: false,
          error: "Recipe not found"
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data: recipe
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    const recipes = await getArticles(db, {
      type: "recipe",
      categorySlug: category || void 0,
      authorSlug: author || void 0,
      limit,
      offset
    });
    return new Response(JSON.stringify({
      success: true,
      data: recipes.items,
      pagination: {
        page,
        limit,
        total: recipes.total,
        totalPages: Math.ceil(recipes.total / limit)
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to fetch recipes",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
