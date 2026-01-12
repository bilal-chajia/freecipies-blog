globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, m as maybeRenderHead, ag as addAttribute, a as renderTemplate, r as renderComponent } from '../chunks/astro/server_Bsmdvglz.mjs';
import { $ as $$Layout } from '../chunks/Layout_Cyf8gyLe.mjs';
/* empty css                                 */
import '../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getTags } from '../chunks/tags.service_BG2nrB-b.mjs';
import { a as getArticles } from '../chunks/articles.service_hseUetrK.mjs';
import { f as hydrateTag } from '../chunks/hydration_D2T5lKEB.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro$1 = createAstro("https://localhost:4321");
const $$TagCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$TagCard;
  const { tag, showArticleCount = false, articleCount = 0 } = Astro2.props;
  const tagUrl = `/tags/${tag.slug}`;
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(tagUrl, "href")} class="tag-card" data-astro-cid-zvzsvsys> <div class="tag-content" data-astro-cid-zvzsvsys> ${tag.imageUrl && renderTemplate`<div class="tag-image" data-astro-cid-zvzsvsys> <img${addAttribute(tag.imageUrl, "src")}${addAttribute(tag.imageAlt || tag.label, "alt")} loading="lazy" data-astro-cid-zvzsvsys> </div>`} <div class="tag-info" data-astro-cid-zvzsvsys> <h3 class="tag-label" data-astro-cid-zvzsvsys>${tag.label}</h3> ${tag.headline && renderTemplate`<p class="tag-headline" data-astro-cid-zvzsvsys>${tag.headline}</p>`} ${showArticleCount && renderTemplate`<span class="article-count" data-astro-cid-zvzsvsys> ${articleCount} ${articleCount === 1 ? "recipe" : "recipes"} </span>`} </div> </div> </a> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/TagCard.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { env } = Astro2.locals.runtime;
  const rawTags = await getTags(env.DB);
  const tags = rawTags.map(hydrateTag);
  const tagArticleCounts = /* @__PURE__ */ new Map();
  for (const tag of tags) {
    const { total } = await getArticles(env.DB, { tagSlug: tag.slug });
    tagArticleCounts.set(tag.slug, total);
  }
  const sortedTags = [...tags].sort((a, b) => {
    return (tagArticleCounts.get(b.slug) || 0) - (tagArticleCounts.get(a.slug) || 0);
  });
  const pageTitle = "Recipe Tags - Freecipies";
  const pageDescription = "Browse recipes by tags. Find exactly what you're looking for with our organized recipe tags.";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": pageTitle, "description": pageDescription, "data-astro-cid-os4i7owy": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="tags-page" data-astro-cid-os4i7owy> <!-- Hero Section --> <section class="hero-section" data-astro-cid-os4i7owy> <div class="hero-container" data-astro-cid-os4i7owy> <h1 class="hero-title" data-astro-cid-os4i7owy>Browse by Tags</h1> <p class="hero-subtitle" data-astro-cid-os4i7owy>
Find recipes organized by ingredients, cooking methods, and dietary
          preferences
</p> </div> </section> <!-- Tags Grid --> <section class="tags-section" data-astro-cid-os4i7owy> <div class="section-container" data-astro-cid-os4i7owy> ${sortedTags.length > 0 ? renderTemplate`<div class="tags-grid" data-astro-cid-os4i7owy> ${sortedTags.map((tag) => renderTemplate`${renderComponent($$result2, "TagCard", $$TagCard, { "tag": tag, "showArticleCount": true, "articleCount": tagArticleCounts.get(tag.slug) || 0, "data-astro-cid-os4i7owy": true })}`)} </div>` : renderTemplate`<div class="empty-state" data-astro-cid-os4i7owy> <p data-astro-cid-os4i7owy>No tags found.</p> </div>`} </div> </section> </main> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/tags/index.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/tags/index.astro";
const $$url = "/tags";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
