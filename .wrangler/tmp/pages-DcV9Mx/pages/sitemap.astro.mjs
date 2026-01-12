globalThis.process ??= {}; globalThis.process.env ??= {};
import '../chunks/pinterest.schema_DDOHgYvi.mjs';
import { a as getArticles } from '../chunks/articles.service_hseUetrK.mjs';
import { a as getCategories } from '../chunks/categories.service_DP4au7sC.mjs';
import { g as getTags } from '../chunks/tags.service_BG2nrB-b.mjs';
import { a as getAuthors } from '../chunks/authors.service_5yxqEIeb.mjs';
export { renderers } from '../renderers.mjs';

const prerender = false;
const GET = async ({ locals, site }) => {
  const env = locals.runtime.env;
  const baseUrl = site?.toString().replace(/\/$/, "") || "https://recipes-saas.com";
  let recipes = [];
  let categories = [];
  let tags = [];
  let authors = [];
  try {
    const [recipesResult, categoriesResult, tagsResult, authorsResult] = await Promise.all([
      getArticles(env.DB, { type: "recipe", limit: 1e3 }),
      getCategories(env.DB, { isOnline: true }),
      getTags(env.DB, { isOnline: true }),
      getAuthors(env.DB, { isOnline: true })
    ]);
    recipes = recipesResult.items;
    categories = categoriesResult;
    tags = tagsResult;
    authors = authorsResult;
  } catch (error) {
    console.error("Error fetching data for sitemap:", error);
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/recipes", priority: "0.9", changefreq: "daily" },
    { url: "/categories", priority: "0.8", changefreq: "weekly" },
    { url: "/tags", priority: "0.8", changefreq: "weekly" },
    { url: "/authors", priority: "0.7", changefreq: "weekly" },
    { url: "/contact", priority: "0.5", changefreq: "monthly" },
    { url: "/faqs", priority: "0.5", changefreq: "monthly" },
    { url: "/about", priority: "0.6", changefreq: "monthly" }
  ];
  const getAbsoluteImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  };
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    ${staticPages.map((page) => `
    <url>
        <loc>${baseUrl}${page.url}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`).join("")}
    ${recipes.map((recipe) => `
    <url>
        <loc>${baseUrl}/recipes/${recipe.slug}</loc>
        <lastmod>${recipe.updatedAt ? new Date(recipe.updatedAt).toISOString().split("T")[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>${recipe.imageUrl ? `
        <image:image>
            <image:loc>${escapeXml(getAbsoluteImageUrl(recipe.imageUrl))}</image:loc>
            <image:title>${escapeXml(recipe.headline)}</image:title>
        </image:image>` : ""}
    </url>`).join("")}
    ${categories.map((cat) => `
    <url>
        <loc>${baseUrl}/categories/${cat.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`).join("")}
    ${tags.map((tag) => `
    <url>
        <loc>${baseUrl}/tags/${tag.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`).join("")}
    ${authors.map((author) => `
    <url>
        <loc>${baseUrl}/authors/${author.slug}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>`).join("")}
</urlset>`;
  return new Response(sitemap.trim(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600"
      // Cache for 1 hour
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
