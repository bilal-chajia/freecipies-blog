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

import { c as createAstro, a as createComponent, d as renderComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../chunks/astro/server_B79ahsw9.mjs';
import { $ as $$Layout } from '../chunks/Layout_DDkk2Mp3.mjs';
import '../chunks/pinterest.schema_eG5oHE2g.mjs';
import { c as getArticles } from '../chunks/articles.service_DgNeye45.mjs';
import { e as getCategories } from '../chunks/categories.service_BzGDlPlq.mjs';
import { g as getTags } from '../chunks/tags.service_DE4uyghe.mjs';
import { h as hydrateArticles, b as hydrateCategories, c as hydrateTags, e as extractImage, g as getImageSrcSet } from '../chunks/hydration_PCOoIFzn.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://localhost:4321");
const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { env } = Astro2.locals.runtime;
  const url = Astro2.url;
  const categoryFilter = url.searchParams.get("category") || "";
  const tagFilter = url.searchParams.get("tag") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 12;
  const offset = (page - 1) * limit;
  let recipes = [];
  let totalRecipes = 0;
  let categories = [];
  let tags = [];
  try {
    const result = await getArticles(env.DB, {
      type: "recipe",
      categorySlug: categoryFilter || void 0,
      tagSlug: tagFilter || void 0,
      limit,
      offset
    });
    recipes = hydrateArticles(result.items);
    totalRecipes = result.total;
    const rawCategories = await getCategories(env.DB, { isOnline: true });
    const rawTags = await getTags(env.DB);
    categories = hydrateCategories(rawCategories);
    tags = hydrateTags(rawTags);
  } catch (error) {
    console.error("Error fetching recipes:", error);
  }
  const totalPages = Math.ceil(totalRecipes / limit);
  const buildFilterUrl = (newCategory, newTag, newPage) => {
    const params = new URLSearchParams();
    const cat = newCategory !== void 0 ? newCategory : categoryFilter;
    const tag = newTag !== void 0 ? newTag : tagFilter;
    const p = newPage !== void 0 ? newPage : page;
    if (cat) params.set("category", cat);
    if (tag) params.set("tag", tag);
    if (p > 1) params.set("page", p.toString());
    const queryString = params.toString();
    return queryString ? `/recipes?${queryString}` : "/recipes";
  };
  const getRecipeImage = (recipe, targetWidth, prefer = "cover") => {
    const cover = extractImage(recipe.imagesJson, "cover", targetWidth);
    const thumbnail = extractImage(recipe.imagesJson, "thumbnail", targetWidth);
    const slotName = prefer === "cover" ? cover.imageUrl ? "cover" : "thumbnail" : thumbnail.imageUrl ? "thumbnail" : "cover";
    const selected = slotName === "cover" ? cover : thumbnail;
    const srcSet = getImageSrcSet(recipe.imagesJson, slotName);
    return { selected, srcSet };
  };
  const parseHexColor = (value) => {
    if (!value) return null;
    const trimmed = value.trim();
    const match = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
    if (!/^[0-9a-fA-F]+$/.test(match)) return null;
    if (match.length === 3 || match.length === 4) {
      const [r, g, b] = match.slice(0, 3).split("");
      return `${r}${r}${g}${g}${b}${b}`;
    }
    if (match.length === 6 || match.length === 8) {
      return match.slice(0, 6);
    }
    return null;
  };
  const getBadgeTextColor = (background) => {
    const hex = parseHexColor(background);
    if (!hex) return "#ffffff";
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1e3;
    return yiq >= 170 ? "#111111" : "#ffffff";
  };
  const getBadgeColors = (color) => {
    const badgeColor = color && color.trim() ? color.trim() : "#ff3366";
    const badgeText = getBadgeTextColor(badgeColor);
    return { badgeColor, badgeText };
  };
  const siteTitle = categoryFilter ? `${categories.find((c) => c.slug === categoryFilter)?.label || "Category"} Recipes - Freecipies` : "All Recipes - Freecipies";
  const siteDescription = "Browse all our delicious and easy-to-follow recipes. Filter by category or tag.";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": siteTitle, "description": siteDescription, "data-astro-cid-ufwbdbbi": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="recipes-page" data-astro-cid-ufwbdbbi> <!-- Page Header --> <section class="page-header" data-astro-cid-ufwbdbbi> <div class="container" data-astro-cid-ufwbdbbi> <h1 class="page-title" data-astro-cid-ufwbdbbi> <span class="title-dot" data-astro-cid-ufwbdbbi></span> ${categoryFilter ? `${categories.find((c) => c.slug === categoryFilter)?.label} Recipes` : "All Recipes"} </h1> <p class="recipe-count" data-astro-cid-ufwbdbbi>${totalRecipes} recipes found</p> </div> </section> <!-- Category Filter Pills --> <section class="filters-section" data-astro-cid-ufwbdbbi> <div class="container" data-astro-cid-ufwbdbbi> <div class="filter-pills" data-astro-cid-ufwbdbbi> <a href="/recipes"${addAttribute([
    "filter-pill",
    { active: !categoryFilter && !tagFilter }
  ], "class:list")} data-astro-cid-ufwbdbbi>
All
</a> ${categories.map((cat) => renderTemplate`<a${addAttribute(buildFilterUrl(
    cat.slug === categoryFilter ? "" : cat.slug,
    void 0,
    1
  ), "href")}${addAttribute([
    "filter-pill",
    { active: categoryFilter === cat.slug }
  ], "class:list")} data-astro-cid-ufwbdbbi> ${cat.label} </a>`)} </div> </div> </section> <!-- Tag Chips --> ${tags.length > 0 && renderTemplate`<section class="tags-section" data-astro-cid-ufwbdbbi> <div class="container" data-astro-cid-ufwbdbbi> <div class="tag-chips" data-astro-cid-ufwbdbbi> ${tags.slice(0, 8).map((tag) => renderTemplate`<a${addAttribute(buildFilterUrl(
    void 0,
    tag.slug === tagFilter ? "" : tag.slug,
    1
  ), "href")}${addAttribute(["tag-chip", { active: tagFilter === tag.slug }], "class:list")}${addAttribute(`--tag-color: ${tag.color || "#ff6600"};`, "style")} data-astro-cid-ufwbdbbi> <div class="chip-image" data-astro-cid-ufwbdbbi> ${tag.imageUrl ? renderTemplate`<img${addAttribute(tag.imageUrl, "src")}${addAttribute(tag.label, "alt")} data-astro-cid-ufwbdbbi>` : renderTemplate`<div class="chip-placeholder" data-astro-cid-ufwbdbbi>${tag.label.charAt(0)}</div>`} </div> <span class="chip-label" data-astro-cid-ufwbdbbi>${tag.label}</span> </a>`)} </div> </div> </section>`} <!-- Active Filters --> ${(categoryFilter || tagFilter) && renderTemplate`<section class="active-filters" data-astro-cid-ufwbdbbi> <div class="container" data-astro-cid-ufwbdbbi> <div class="filter-tags" data-astro-cid-ufwbdbbi> ${categoryFilter && renderTemplate`<span class="filter-tag" data-astro-cid-ufwbdbbi>
Category:${" "} ${categories.find((c) => c.slug === categoryFilter)?.label} <a${addAttribute(buildFilterUrl("", tagFilter, 1), "href")} class="remove-filter" data-astro-cid-ufwbdbbi>
×
</a> </span>`} ${tagFilter && renderTemplate`<span class="filter-tag" data-astro-cid-ufwbdbbi>
Tag: ${tags.find((t) => t.slug === tagFilter)?.label} <a${addAttribute(buildFilterUrl(categoryFilter, "", 1), "href")} class="remove-filter" data-astro-cid-ufwbdbbi>
×
</a> </span>`} <a href="/recipes" class="clear-all" data-astro-cid-ufwbdbbi>
Clear All
</a> </div> </div> </section>`} <!-- Recipe Grid --> <section class="recipes-grid-section" data-astro-cid-ufwbdbbi> <div class="container" data-astro-cid-ufwbdbbi> <h2 class="sr-only" data-astro-cid-ufwbdbbi>Recipe results</h2> ${recipes.length > 0 ? renderTemplate`<div class="recipes-grid" data-astro-cid-ufwbdbbi> ${recipes.map((recipe) => {
    const { selected, srcSet } = getRecipeImage(recipe, 400, "cover");
    const sizes = "(max-width: 768px) 50vw, 25vw";
    const { badgeColor, badgeText } = getBadgeColors(recipe.categoryColor);
    return renderTemplate`<article class="recipe-card" data-astro-cid-ufwbdbbi> <a${addAttribute(`/recipes/${recipe.slug}`, "href")} class="card-image-link" data-astro-cid-ufwbdbbi> ${(selected.imageUrl || recipe.imageUrl) && renderTemplate`<img${addAttribute(selected.imageUrl || recipe.imageUrl, "src")}${addAttribute(selected.imageAlt || recipe.imageAlt || recipe.headline, "alt")}${addAttribute(selected.imageWidth || recipe.imageWidth || 400, "width")}${addAttribute(selected.imageHeight || recipe.imageHeight || 300, "height")}${addAttribute(srcSet || void 0, "srcset")}${addAttribute(srcSet ? sizes : void 0, "sizes")} loading="lazy" data-astro-cid-ufwbdbbi>`} <span class="card-badge"${addAttribute(`background: ${badgeColor}; color: ${badgeText};`, "style")} data-astro-cid-ufwbdbbi> ${recipe.categoryLabel} </span> </a> <div class="card-body" data-astro-cid-ufwbdbbi> <h3 class="card-title" data-astro-cid-ufwbdbbi> <a${addAttribute(`/recipes/${recipe.slug}`, "href")} data-astro-cid-ufwbdbbi>${recipe.headline}</a> </h3> <div class="card-meta" data-astro-cid-ufwbdbbi> ${recipe.recipeJson?.prepTime && renderTemplate`<span class="meta-item" data-astro-cid-ufwbdbbi> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-ufwbdbbi> <circle cx="12" cy="12" r="10" data-astro-cid-ufwbdbbi></circle> <path d="M12 6v6l4 2" data-astro-cid-ufwbdbbi></path> </svg> ${recipe.recipeJson.prepTime} </span>`} ${recipe.recipeJson?.servings && renderTemplate`<span class="meta-item" data-astro-cid-ufwbdbbi> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-ufwbdbbi> <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" data-astro-cid-ufwbdbbi></path> <circle cx="9" cy="7" r="4" data-astro-cid-ufwbdbbi></circle> </svg> ${recipe.recipeJson.servings} </span>`} </div> </div> </article>`;
  })} </div>` : renderTemplate`<div class="no-recipes" data-astro-cid-ufwbdbbi> <p data-astro-cid-ufwbdbbi>No recipes found matching your filters.</p> <a href="/recipes" class="reset-btn" data-astro-cid-ufwbdbbi>
View All Recipes
</a> </div>`} <!-- Pagination --> ${totalPages > 1 && renderTemplate`<nav class="pagination" data-astro-cid-ufwbdbbi> ${page > 1 && renderTemplate`<a${addAttribute(buildFilterUrl(void 0, void 0, page - 1), "href")} class="page-btn prev" data-astro-cid-ufwbdbbi>
← Previous
</a>`} <div class="page-numbers" data-astro-cid-ufwbdbbi> ${Array.from({ length: totalPages }, (_, i) => i + 1).map(
    (p) => renderTemplate`<a${addAttribute(buildFilterUrl(void 0, void 0, p), "href")}${addAttribute(["page-num", { active: p === page }], "class:list")} data-astro-cid-ufwbdbbi> ${p} </a>`
  )} </div> ${page < totalPages && renderTemplate`<a${addAttribute(buildFilterUrl(void 0, void 0, page + 1), "href")} class="page-btn next" data-astro-cid-ufwbdbbi>
Next →
</a>`} </nav>`} </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/recipes/index.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/recipes/index.astro";
const $$url = "/recipes";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
