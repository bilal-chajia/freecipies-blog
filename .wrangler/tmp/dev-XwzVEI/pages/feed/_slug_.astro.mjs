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

import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { c as getArticles } from '../../chunks/articles.service_DgNeye45.mjs';
import { a as getCategoryBySlug } from '../../chunks/categories.service_BzGDlPlq.mjs';
import { e as extractImage } from '../../chunks/hydration_PCOoIFzn.mjs';
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
  const getRecipeImageUrl = (recipe) => {
    const cover = extractImage(recipe.imagesJson, "cover", 1200);
    const thumbnail = extractImage(recipe.imagesJson, "thumbnail", 1200);
    return cover.imageUrl || thumbnail.imageUrl || recipe.imageUrl || "";
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
    ${recipes.map((recipe) => {
    const imageUrl = getRecipeImageUrl(recipe);
    return `
    <url>
        <loc>${baseUrl}/recipes/${recipe.slug}</loc>
        <lastmod>${recipe.updatedAt ? new Date(recipe.updatedAt).toISOString().split("T")[0] : today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>${imageUrl ? `
        <image:image>
            <image:loc>${escapeXml(getAbsoluteImageUrl(imageUrl))}</image:loc>
            <image:title>${escapeXml(recipe.headline)}</image:title>
        </image:image>` : ""}
    </url>`;
  }).join("")}
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
