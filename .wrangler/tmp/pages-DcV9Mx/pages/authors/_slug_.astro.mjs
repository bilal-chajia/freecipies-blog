globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, ag as addAttribute } from '../../chunks/astro/server_Bsmdvglz.mjs';
import { $ as $$Layout } from '../../chunks/Layout_Cyf8gyLe.mjs';
import { $ as $$RecipeCard } from '../../chunks/RecipeCard_DYJosb0M.mjs';
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getAuthorBySlug } from '../../chunks/authors.service_5yxqEIeb.mjs';
import { a as getArticles } from '../../chunks/articles.service_hseUetrK.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://localhost:4321");
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const { env } = Astro2.locals.runtime;
  if (!slug) {
    return Astro2.redirect("/404");
  }
  const author = await getAuthorBySlug(env.DB, slug);
  if (!author) {
    return Astro2.redirect("/404");
  }
  const { items: articles, total } = await getArticles(env.DB, {
    authorSlug: slug
  });
  let bioParagraphs = [];
  let socialNetworks = [];
  if (author.bioJson) {
    try {
      const bio = typeof author.bioJson === "string" ? JSON.parse(author.bioJson) : author.bioJson;
      bioParagraphs = bio.paragraphs || [];
      socialNetworks = bio.networks || [];
    } catch (e) {
    }
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": author.metaTitle, "description": author.metaDescription, "data-astro-cid-7aexiinu": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="author-profile" data-astro-cid-7aexiinu> <!-- Author Hero --> <section class="hero-section" data-astro-cid-7aexiinu> <div class="hero-container" data-astro-cid-7aexiinu> <div class="author-header" data-astro-cid-7aexiinu> <!-- Avatar --> <div class="avatar-container" data-astro-cid-7aexiinu> ${author.imageUrl ? renderTemplate`<img${addAttribute(author.imageUrl, "src")}${addAttribute(author.imageAlt || author.name, "alt")}${addAttribute(author.imageWidth || 150, "width")}${addAttribute(author.imageHeight || 150, "height")} class="author-avatar" data-astro-cid-7aexiinu>` : renderTemplate`<div class="avatar-placeholder" data-astro-cid-7aexiinu> <span data-astro-cid-7aexiinu>${author.name.charAt(0).toUpperCase()}</span> </div>`} </div> <!-- Info --> <div class="author-info" data-astro-cid-7aexiinu> <h1 class="author-name" data-astro-cid-7aexiinu>${author.name}</h1> ${author.job && renderTemplate`<p class="author-job" data-astro-cid-7aexiinu>${author.job}</p>`} <p class="author-description" data-astro-cid-7aexiinu> ${author.shortDescription} </p> <!-- Stats --> <div class="author-stats" data-astro-cid-7aexiinu> <div class="stat" data-astro-cid-7aexiinu> <span class="stat-value" data-astro-cid-7aexiinu>${total}</span> <span class="stat-label" data-astro-cid-7aexiinu>${total === 1 ? "Recipe" : "Recipes"}</span> </div> </div> <!-- Social Links --> ${socialNetworks.length > 0 && renderTemplate`<div class="social-links" data-astro-cid-7aexiinu> ${socialNetworks.map((network) => renderTemplate`<a${addAttribute(network.url, "href")} target="_blank" rel="noopener noreferrer" class="social-link"${addAttribute(network.name, "title")} data-astro-cid-7aexiinu> ${network.name} </a>`)} </div>`} </div> </div> </div> </section> <!-- Bio Section --> ${bioParagraphs.length > 0 && renderTemplate`<section class="bio-section" data-astro-cid-7aexiinu> <div class="section-container" data-astro-cid-7aexiinu> <h2 class="section-title" data-astro-cid-7aexiinu>About ${author.name}</h2> <div class="bio-content" data-astro-cid-7aexiinu> ${bioParagraphs.map((paragraph) => renderTemplate`<p data-astro-cid-7aexiinu>${paragraph}</p>`)} </div> </div> </section>`} <!-- Recipes Section --> <section class="recipes-section" data-astro-cid-7aexiinu> <div class="section-container" data-astro-cid-7aexiinu> <div class="section-header" data-astro-cid-7aexiinu> <h2 class="section-title" data-astro-cid-7aexiinu>Recipes by ${author.name}</h2> <span class="recipe-count" data-astro-cid-7aexiinu>${total} ${total === 1 ? "recipe" : "recipes"}</span> </div> ${articles.length > 0 ? renderTemplate`<div class="recipes-grid" data-astro-cid-7aexiinu> ${articles.map((article) => renderTemplate`${renderComponent($$result2, "RecipeCard", $$RecipeCard, { "recipe": article, "data-astro-cid-7aexiinu": true })}`)} </div>` : renderTemplate`<div class="empty-state" data-astro-cid-7aexiinu> <p data-astro-cid-7aexiinu>No recipes published yet.</p> </div>`} </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/authors/[slug].astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/authors/[slug].astro";
const $$url = "/authors/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
