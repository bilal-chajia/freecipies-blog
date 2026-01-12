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

import { c as createAstro, a as createComponent, d as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_B79ahsw9.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DDkk2Mp3.mjs';
import { $ as $$RecipeCard } from '../../chunks/RecipeCard_3G-w8UC6.mjs';
import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { c as getArticles } from '../../chunks/articles.service_DgNeye45.mjs';
import { a as getTagBySlug } from '../../chunks/tags.service_DE4uyghe.mjs';
import { h as hydrateArticles } from '../../chunks/hydration_PCOoIFzn.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://localhost:4321");
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const { env } = Astro2.locals.runtime;
  if (!slug) return Astro2.redirect("/404");
  const tag = await getTagBySlug(env.DB, slug);
  if (!tag) return Astro2.redirect("/404");
  const { items: rawArticles, total } = await getArticles(env.DB, {
    });
  const articles = hydrateArticles(rawArticles);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `${tag.label} Recipes`, "description": `Discover delicious recipes tagged with ${tag.label}`, "data-astro-cid-ytpo4vtr": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="tag-archive" data-astro-cid-ytpo4vtr> <!-- Hero Section --> <section class="hero-section" data-astro-cid-ytpo4vtr> <div class="hero-container" data-astro-cid-ytpo4vtr> <h1 class="hero-title" data-astro-cid-ytpo4vtr>${tag.label}</h1> <div class="tag-meta" data-astro-cid-ytpo4vtr> <span class="recipe-count" data-astro-cid-ytpo4vtr>${total} ${total === 1 ? "recipe" : "recipes"}</span> </div> </div> </section> <!-- Recipes Grid --> <section class="recipes-section" data-astro-cid-ytpo4vtr> <div class="section-container" data-astro-cid-ytpo4vtr> <div class="section-header" data-astro-cid-ytpo4vtr> <h2 class="section-title" data-astro-cid-ytpo4vtr>Recipes tagged "${tag.label}"</h2> </div> ${articles.length > 0 ? renderTemplate`<div class="recipes-grid" data-astro-cid-ytpo4vtr> ${articles.map((article) => renderTemplate`${renderComponent($$result2, "RecipeCard", $$RecipeCard, { "recipe": article, "data-astro-cid-ytpo4vtr": true })}`)} </div>` : renderTemplate`<div class="empty-state" data-astro-cid-ytpo4vtr> <p data-astro-cid-ytpo4vtr>No recipes found with this tag.</p> </div>`} </div> </section> <!-- Back to Tags --> <section class="back-section" data-astro-cid-ytpo4vtr> <div class="section-container" data-astro-cid-ytpo4vtr> <a href="/tags" class="back-link" data-astro-cid-ytpo4vtr>← Browse all tags</a> </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/tags/[slug].astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/tags/[slug].astro";
const $$url = "/tags/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
