if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

import '../chunks/pinterest.schema_eG5oHE2g.mjs';
import { c as getArticles } from '../chunks/articles.service_DgNeye45.mjs';
import { e as getCategories } from '../chunks/categories.service_BzGDlPlq.mjs';
import { g as getTags } from '../chunks/tags.service_DE4uyghe.mjs';
import { a as getAuthors } from '../chunks/authors.service_DDYOeshw.mjs';
import { e as extractImage } from '../chunks/hydration_PCOoIFzn.mjs';
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
  const getRecipeImageUrl = (recipe) => {
    const cover = extractImage(recipe.imagesJson, "cover", 1200);
    const thumbnail = extractImage(recipe.imagesJson, "thumbnail", 1200);
    return cover.imageUrl || thumbnail.imageUrl || recipe.imageUrl || "";
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
    ${recipes.map((recipe) => {
    const imageUrl = getRecipeImageUrl(recipe);
    return `
    <url>
        <loc>${baseUrl}/recipes/${recipe.slug}</loc>
        <lastmod>${recipe.updatedAt ? new Date(recipe.updatedAt).toISOString().split("T")[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>${imageUrl ? `
        <image:image>
            <image:loc>${escapeXml(getAbsoluteImageUrl(imageUrl))}</image:loc>
            <image:title>${escapeXml(recipe.headline)}</image:title>
        </image:image>` : ""}
    </url>`;
  }).join("")}
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
