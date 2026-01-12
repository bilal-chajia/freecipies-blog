globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, m as maybeRenderHead, ag as addAttribute, a as renderTemplate, r as renderComponent } from '../../chunks/astro/server_Bsmdvglz.mjs';
import { $ as $$Layout } from '../../chunks/Layout_Ca0Ks7DO.mjs';
import '../../chunks/pinterest.schema_DDOHgYvi.mjs';
import { g as getCategoryBySlug, a as getCategories } from '../../chunks/categories.service_DP4au7sC.mjs';
import { a as getArticles } from '../../chunks/articles.service_hseUetrK.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const $$Astro$1 = createAstro("https://localhost:4321");
const $$ArticleCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$ArticleCard;
  const { article, loading = "lazy" } = Astro2.props;
  const image = {
    url: article.imageUrl || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80",
    alt: article.imageAlt || article.headline,
    width: article.imageWidth || 800,
    height: article.imageHeight || 600
  };
  const recipe = article.recipeJson ? typeof article.recipeJson === "string" ? JSON.parse(article.recipeJson) : article.recipeJson : null;
  return renderTemplate`${maybeRenderHead()}<article class="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md
hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex
flex-col h-full"> <a${addAttribute(article.route, "href")} class="block relative aspect-video
overflow-hidden"> <!-- Image --> <img${addAttribute(image.url, "src")}${addAttribute(image.alt || article.headline, "alt")}${addAttribute(image.width, "width")}${addAttribute(image.height, "height")}${addAttribute(loading, "loading")} class="w-full h-full object-cover group-hover:scale-110
transition-transform duration-500"> <!-- Favorite Badge --> ${article.isFavorite && renderTemplate`<div class="absolute top-3 right-3 bg-red-500 text-white
px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 z-10"> ${" "} <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"> ${" "} <path d="M3.172
5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10
17.657l-6.828-6.829a4 4 0 010-5.656z"></path>${" "} </svg>${" "} <span>Featured</span>${" "} </div>`} <!-- Overlay --> <div class="absolute inset-0 bg-gradient-to-t from-black/60
to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300
flex items-end p-4"> <span class="text-white font-medium">Read More</span> </div> </a> <!-- Info --> <div class="p-5 flex-grow flex flex-col"> <!--
Category --> <div class="flex items-center gap-2 mb-3"> <span class="text-xs
font-semibold uppercase tracking-wide"${addAttribute(`color: ${article.categoryColor || "#2563eb"}`, "style")}> ${article.categoryLabel || article.categorySlug?.replace(/-/g, " ") || "Uncategorized"} </span> </div> <!-- Title --> <h3 class="text-xl font-bold text-gray-900
dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600
dark:group-hover:text-blue-400 transition-colors"> ${article.headline} </h3> <!-- Description --> <p class="text-gray-600 dark:text-gray-300 text-sm mb-4
line-clamp-2 flex-grow"> ${article.shortDescription} </p> <!-- Meta Info --> <div class="flex items-center justify-between text-sm text-gray-500
dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto"> <div class="flex items-center gap-1"> <span>${new Date(
    article.publishedAt || article.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  ).toLocaleDateString()}</span> </div> ${recipe && renderTemplate`<div class="flex items-center gap-1"> ${" "} <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> ${" "} <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0
0118 0z"></path>${" "} </svg>${" "} <span>${recipe?.prepTime || "N/A"}</span>${" "} </div>`} </div> </div> </article>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/ArticleCard.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const { env } = Astro2.locals.runtime;
  if (!slug) {
    return Astro2.redirect("/404");
  }
  const category = await getCategoryBySlug(env.DB, slug);
  if (!category) {
    return Astro2.redirect("/404");
  }
  const { items: articles } = await getArticles(env.DB, {
    categorySlug: slug,
    limit: 20
  });
  const featuredArticle = articles[0];
  const gridArticles = articles.slice(1);
  const parseRecipe = (json) => {
    if (!json) return null;
    try {
      return typeof json === "string" ? JSON.parse(json) : json;
    } catch {
      return null;
    }
  };
  const featuredRecipe = featuredArticle ? parseRecipe(featuredArticle.recipeJson) : null;
  const allCategories = await getCategories(env.DB, { isOnline: true });
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": category.metaTitle, "description": category.metaDescription, "data-astro-cid-dqg6fwsj": true }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<section class="category-hero" data-astro-cid-dqg6fwsj> <div class="hero-container" data-astro-cid-dqg6fwsj> ${featuredArticle && renderTemplate`<a${addAttribute(`/recipes/${featuredArticle.slug}`, "href")} class="featured-card" data-astro-cid-dqg6fwsj> <div class="featured-image" data-astro-cid-dqg6fwsj> ${featuredArticle.imageUrl && renderTemplate`<img${addAttribute(featuredArticle.imageUrl, "src")}${addAttribute(featuredArticle.imageAlt || featuredArticle.label, "alt")} loading="eager" data-astro-cid-dqg6fwsj>`} <div class="featured-overlay" data-astro-cid-dqg6fwsj> <span class="featured-badge" data-astro-cid-dqg6fwsj>${category.label}</span> <h2 class="featured-title" data-astro-cid-dqg6fwsj>${featuredArticle.label}</h2> <div class="featured-meta" data-astro-cid-dqg6fwsj> ${featuredRecipe?.cookTime && renderTemplate`<span data-astro-cid-dqg6fwsj>⏱ ${featuredRecipe.cookTime}</span>`} </div> </div> </div> </a>`} <div class="hero-content" data-astro-cid-dqg6fwsj> <h1 class="category-title" data-astro-cid-dqg6fwsj>${category.label}</h1> <p class="category-description" data-astro-cid-dqg6fwsj> ${category.shortDescription || category.headline} </p> <a href="#newsletter" class="cta-button" data-astro-cid-dqg6fwsj> Join My Mailing List </a> </div> </div> </section>  <section class="category-nav-section" data-astro-cid-dqg6fwsj> <div class="container" data-astro-cid-dqg6fwsj> <h2 class="nav-title" data-astro-cid-dqg6fwsj>Want to Learn How to Make?</h2> <div class="category-chips" data-astro-cid-dqg6fwsj> ${allCategories.map((cat) => renderTemplate`<a${addAttribute(`/categories/${cat.slug}`, "href")}${addAttribute(["category-chip", { active: cat.slug === slug }], "class:list")} data-astro-cid-dqg6fwsj> ${cat.imageUrl && renderTemplate`<img${addAttribute(cat.imageUrl, "src")}${addAttribute(cat.label, "alt")} class="chip-image" data-astro-cid-dqg6fwsj>`} <span class="chip-label" data-astro-cid-dqg6fwsj>${cat.label}</span> <span class="chip-type" data-astro-cid-dqg6fwsj>Category</span> </a>`)} </div> </div> </section>  <section class="recipes-section" data-astro-cid-dqg6fwsj> <div class="container" data-astro-cid-dqg6fwsj> ${gridArticles.length > 0 ? renderTemplate`<div class="recipe-grid" data-astro-cid-dqg6fwsj> ${gridArticles.map((article) => renderTemplate`${renderComponent($$result2, "ArticleCard", $$ArticleCard, { "article": article, "data-astro-cid-dqg6fwsj": true })}`)} </div>` : articles.length === 0 ? renderTemplate`<div class="empty-state" data-astro-cid-dqg6fwsj> <p data-astro-cid-dqg6fwsj>No recipes found in this category yet.</p> </div>` : null} </div> </section>  <section class="newsletter-section" id="newsletter" data-astro-cid-dqg6fwsj> <div class="newsletter-bar" data-astro-cid-dqg6fwsj> <div class="newsletter-content" data-astro-cid-dqg6fwsj> <div class="newsletter-icon" data-astro-cid-dqg6fwsj> <svg width="48" height="48" viewBox="0 0 24 24" fill="none" data-astro-cid-dqg6fwsj> <circle cx="12" cy="12" r="10" fill="#ff6b35" data-astro-cid-dqg6fwsj></circle> <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-dqg6fwsj></path> </svg> </div> <div class="newsletter-text" data-astro-cid-dqg6fwsj> <h3 data-astro-cid-dqg6fwsj>Keep Current at All Times</h3> <p data-astro-cid-dqg6fwsj>Subscribe Now for Immediate Updates on My Latest Recipes!</p> </div> </div> <form class="newsletter-form" data-astro-cid-dqg6fwsj> <input type="email" placeholder="Your email address" required data-astro-cid-dqg6fwsj> <label class="terms-checkbox" data-astro-cid-dqg6fwsj> <input type="checkbox" required data-astro-cid-dqg6fwsj> <span data-astro-cid-dqg6fwsj>I have read and agree to the terms & conditions</span> </label> <button type="submit" data-astro-cid-dqg6fwsj>Sign Up Now</button> </form> </div> </section> ` })} `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/categories/[slug].astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/categories/[slug].astro";
const $$url = "/categories/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
