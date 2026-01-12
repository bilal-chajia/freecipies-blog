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

import { c as createAstro, a as createComponent, m as maybeRenderHead, b as addAttribute, r as renderTemplate, d as renderComponent, F as Fragment, f as renderScript } from './astro/server_B79ahsw9.mjs';
import './pinterest.schema_eG5oHE2g.mjs';
import { c as getArticles } from './articles.service_DgNeye45.mjs';
import { e as extractImage, g as getImageSrcSet } from './hydration_PCOoIFzn.mjs';
/* empty css                          */

const $$Astro$1 = createAstro("https://localhost:4321");
const $$PopularRecipes = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$PopularRecipes;
  const { currentSlug = "", limit = 5 } = Astro2.props;
  let recipes = [];
  try {
    const { runtime } = Astro2.locals;
    if (runtime?.env?.DB) {
      const result = await getArticles(runtime.env.DB, {
        type: "recipe",
        limit: limit + 1
        // Get one extra in case we need to filter out current
      });
      recipes = (result.items || []).filter((r) => r.slug !== currentSlug).slice(0, limit);
    }
  } catch (e) {
    console.error("Error loading popular recipes:", e);
  }
  return renderTemplate`${maybeRenderHead()}<div class="popular-recipes-widget" data-astro-cid-gjgjpeik> <div class="widget-header" data-astro-cid-gjgjpeik> <span class="header-dot" data-astro-cid-gjgjpeik></span> <h3 data-astro-cid-gjgjpeik>Popular Recipes</h3> </div> ${recipes.length > 0 ? renderTemplate`<div class="recipe-list" data-astro-cid-gjgjpeik> ${recipes.map((recipe) => {
    const thumbnail = extractImage(recipe.imagesJson, "thumbnail", 120);
    const cover = extractImage(recipe.imagesJson, "cover", 120);
    const slotName = thumbnail.imageUrl ? "thumbnail" : "cover";
    const selected = thumbnail.imageUrl ? thumbnail : cover;
    const srcSet = getImageSrcSet(recipe.imagesJson, slotName);
    const sizes = "80px";
    return renderTemplate`<a${addAttribute(`/recipes/${recipe.slug}`, "href")} class="recipe-item" data-astro-cid-gjgjpeik> <div class="recipe-content" data-astro-cid-gjgjpeik> <h4 class="recipe-title" data-astro-cid-gjgjpeik>${recipe.label}</h4> <div class="recipe-meta" data-astro-cid-gjgjpeik> ${recipe.categoryLabel && renderTemplate`<span class="category"${addAttribute(`color: ${recipe.category?.color || "#666"}`, "style")} data-astro-cid-gjgjpeik> ${recipe.categoryLabel} </span>`} ${recipe.recipeJson?.cookTime && renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-gjgjpeik": true }, { "default": async ($$result2) => renderTemplate` <span class="separator" data-astro-cid-gjgjpeik>•</span> <span class="cook-time" data-astro-cid-gjgjpeik>${recipe.recipeJson.cookTime}</span> ` })}`} </div> </div> ${(selected.imageUrl || recipe.imageUrl) && renderTemplate`<img${addAttribute(selected.imageUrl || recipe.imageUrl, "src")}${addAttribute(selected.imageAlt || recipe.imageAlt || recipe.label, "alt")}${addAttribute(selected.imageWidth || recipe.imageWidth || 80, "width")}${addAttribute(selected.imageHeight || recipe.imageHeight || 80, "height")}${addAttribute(srcSet || void 0, "srcset")}${addAttribute(srcSet ? sizes : void 0, "sizes")} class="recipe-thumb" loading="lazy" data-astro-cid-gjgjpeik>`} </a>`;
  })} </div>` : renderTemplate`<p class="no-recipes" data-astro-cid-gjgjpeik>More recipes coming soon!</p>`} </div> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/PopularRecipes.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$NewsletterWidget = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$NewsletterWidget;
  const {
    title = "Keep Current at All Times",
    subtitle = "Subscribe to our newsletter to get our newest articles instantly!"
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="newsletter-widget" data-astro-cid-e4daz5ew> <div class="widget-icon" data-astro-cid-e4daz5ew> <svg width="40" height="40" viewBox="0 0 24 24" fill="none" data-astro-cid-e4daz5ew> <circle cx="12" cy="12" r="10" fill="#ff6b35" data-astro-cid-e4daz5ew></circle> <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-e4daz5ew></path> </svg> </div> <h3 class="widget-title" data-astro-cid-e4daz5ew>${title}</h3> <p class="widget-subtitle" data-astro-cid-e4daz5ew>${subtitle}</p> <form class="subscribe-form" action="/api/subscribe" method="POST" data-astro-cid-e4daz5ew> <input type="email" name="email" placeholder="Your email address" required class="email-input" data-astro-cid-e4daz5ew> <button type="submit" class="subscribe-btn" data-astro-cid-e4daz5ew> Subscribe </button> </form> </div>  ${renderScript($$result, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/NewsletterWidget.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/NewsletterWidget.astro", void 0);

export { $$PopularRecipes as $, $$NewsletterWidget as a };
