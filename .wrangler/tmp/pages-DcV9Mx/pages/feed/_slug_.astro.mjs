globalThis.process ??= {}; globalThis.process.env ??= {};
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { a as getArticles } from '../../chunks/articles.service_hseUetrK.mjs';
import { g as getCategoryBySlug } from '../../chunks/categories.service_DP4au7sC.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ params, locals, site }) => {
  const env = locals.runtime.env;
  const categorySlug = params.slug;
  const baseUrl = site?.toString().replace(/\/$/, "") || "https://recipes-saas.com";
  if (!categorySlug) {
    return new Response("Category not specified", { status: 400 });
  }
  let category = null;
  let recipes = [];
  try {
    category = await getCategoryBySlug(env.DB, categorySlug);
    if (!category) {
      return new Response("Category not found", { status: 404 });
    }
    const result = await getArticles(env.DB, {
      type: "recipe",
      categorySlug,
      limit: 1e3
    });
    recipes = result.items;
  } catch (error) {
    console.error("Error fetching category feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const getAbsoluteImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    <url>
        <loc>${baseUrl}/categories/${categorySlug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    ${recipes.map((recipe) => `
    <url>
        <loc>${baseUrl}/recipes/${recipe.slug}</loc>
        <lastmod>${recipe.updatedAt ? new Date(recipe.updatedAt).toISOString().split("T")[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>${recipe.imageUrl ? `
        <image:image>
            <image:loc>${escapeXml(getAbsoluteImageUrl(recipe.imageUrl))}</image:loc>
            <image:title>${escapeXml(recipe.headline)}</image:title>
        </image:image>` : ""}
    </url>`).join("")}
</urlset>`;
  return new Response(sitemap.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
function escapeXml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
