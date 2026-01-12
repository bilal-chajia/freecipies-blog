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

import { c as createAstro, a as createComponent, m as maybeRenderHead, b as addAttribute, r as renderTemplate, d as renderComponent } from '../chunks/astro/server_B79ahsw9.mjs';
import { $ as $$Layout } from '../chunks/Layout_DDkk2Mp3.mjs';
import { e as extractImage, g as getImageSrcSet, d as hydrateAuthor } from '../chunks/hydration_PCOoIFzn.mjs';
/* empty css                                 */
import '../chunks/pinterest.schema_eG5oHE2g.mjs';
import { a as getAuthors } from '../chunks/authors.service_DDYOeshw.mjs';
import { c as getArticles } from '../chunks/articles.service_DgNeye45.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro$1 = createAstro("https://localhost:4321");
const $$AuthorCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$AuthorCard;
  const { author, showArticleCount = false, articleCount = 0 } = Astro2.props;
  const authorUrl = `/authors/${author.slug}`;
  const avatar = extractImage(author.imagesJson, "avatar", 200);
  const avatarSrcSet = getImageSrcSet(author.imagesJson, "avatar");
  const avatarSizes = "120px";
  return renderTemplate`${maybeRenderHead()}<article class="author-card" data-astro-cid-32rj7774> <a${addAttribute(authorUrl, "href")} class="author-link" data-astro-cid-32rj7774> <!-- Author Avatar --> <div class="author-avatar" data-astro-cid-32rj7774> ${avatar.imageUrl || author.imageUrl ? renderTemplate`<img${addAttribute(avatar.imageUrl || author.imageUrl, "src")}${addAttribute(avatar.imageAlt || author.imageAlt || author.name, "alt")}${addAttribute(avatar.imageWidth || author.imageWidth || 120, "width")}${addAttribute(avatar.imageHeight || author.imageHeight || 120, "height")}${addAttribute(avatarSrcSet || void 0, "srcset")}${addAttribute(avatarSrcSet ? avatarSizes : void 0, "sizes")} loading="lazy" data-astro-cid-32rj7774>` : renderTemplate`<div class="avatar-placeholder" data-astro-cid-32rj7774> <span data-astro-cid-32rj7774>${author.name.charAt(0).toUpperCase()}</span> </div>`} </div> <!-- Author Info --> <div class="author-info" data-astro-cid-32rj7774> <h3 class="author-name" data-astro-cid-32rj7774>${author.name}</h3> ${author.job && renderTemplate`<p class="author-job" data-astro-cid-32rj7774>${author.job}</p>`} ${author.shortDescription && renderTemplate`<p class="author-description" data-astro-cid-32rj7774>${author.shortDescription}</p>`} ${showArticleCount && renderTemplate`<div class="author-meta" data-astro-cid-32rj7774> <span class="article-count" data-astro-cid-32rj7774> <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-32rj7774> ${" "} <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" data-astro-cid-32rj7774></path> <polyline points="14,2 14,8 20,8" data-astro-cid-32rj7774></polyline>${" "} <line x1="16" y1="13" x2="8" y2="13" data-astro-cid-32rj7774></line> <line x1="16" y1="17" x2="8" y2="17" data-astro-cid-32rj7774></line>${" "} <line x1="10" y1="9" x2="8" y2="9" data-astro-cid-32rj7774></line> </svg>${" "} ${articleCount} ${articleCount === 1 ? "Recipe" : "Recipes"}${" "} </span> </div>`} </div> </a> </article> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/AuthorCard.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { env } = Astro2.locals.runtime;
  const rawAuthors = await getAuthors(env.DB, { isOnline: true });
  const authors = rawAuthors.map(hydrateAuthor);
  const authorArticleCounts = /* @__PURE__ */ new Map();
  for (const author of authors) {
    const { total } = await getArticles(env.DB, { authorSlug: author.slug });
    authorArticleCounts.set(author.slug, total);
  }
  const pageTitle = "Our Recipe Creators - Freecipies";
  const pageDescription = "Meet the talented chefs and food enthusiasts behind our delicious recipes. Discover their culinary journeys and cooking expertise.";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": pageTitle, "description": pageDescription, "data-astro-cid-5ijxez7g": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="authors-page" data-astro-cid-5ijxez7g> <!-- Hero Section --> <section class="hero-section" data-astro-cid-5ijxez7g> <div class="hero-container" data-astro-cid-5ijxez7g> <h1 class="hero-title" data-astro-cid-5ijxez7g>Meet Our Creators</h1> <p class="hero-subtitle" data-astro-cid-5ijxez7g>
Talented chefs and food enthusiasts sharing their passion through
          delicious recipes
</p> </div> </section> <!-- Authors Grid --> <section class="authors-section" data-astro-cid-5ijxez7g> <div class="section-container" data-astro-cid-5ijxez7g> <h2 class="sr-only" data-astro-cid-5ijxez7g>Author list</h2> ${authors.length > 0 ? renderTemplate`<div class="authors-grid" data-astro-cid-5ijxez7g> ${authors.map((author) => renderTemplate`${renderComponent($$result2, "AuthorCard", $$AuthorCard, { "author": author, "showArticleCount": true, "articleCount": authorArticleCounts.get(author.slug) || 0, "data-astro-cid-5ijxez7g": true })}`)} </div>` : renderTemplate`<div class="empty-state" data-astro-cid-5ijxez7g> <p data-astro-cid-5ijxez7g>No authors found.</p> </div>`} </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/authors/index.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/authors/index.astro";
const $$url = "/authors";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
