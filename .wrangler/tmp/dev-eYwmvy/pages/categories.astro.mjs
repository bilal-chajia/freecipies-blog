globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, m as maybeRenderHead, ag as addAttribute, a as renderTemplate, r as renderComponent } from '../chunks/astro/server_Bsmdvglz.mjs';
import { $ as $$Layout } from '../chunks/Layout_Ca0Ks7DO.mjs';
import '../chunks/pinterest.schema_DDOHgYvi.mjs';
import { a as getCategories } from '../chunks/categories.service_DP4au7sC.mjs';
import { a as hydrateCategory } from '../chunks/hydration_D2T5lKEB.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro$1 = createAstro("https://localhost:4321");
const $$CategoryCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$CategoryCard;
  const { category } = Astro2.props;
  const image = {
    url: category.imageUrl || "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&q=80",
    // Remote placeholder
    alt: category.imageAlt || category.label,
    width: category.imageWidth || 800,
    height: category.imageHeight || 600
  };
  return renderTemplate`${maybeRenderHead()}<article class="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden transform hover:-translate-y-1"> <a${addAttribute(`/categories/${category.slug}`, "href")} class="group relative block aspect-video rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"> <!-- Category Image with Overlay --> <div class="relative h-full overflow-hidden"> <img${addAttribute(image.url, "src")}${addAttribute(image.alt || category.label, "alt")}${addAttribute(image.width, "width")}${addAttribute(image.height, "height")} loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"> <!-- Gradient Overlay --> <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div> <!-- Content Overlay --> <div class="absolute inset-0 flex flex-col justify-end p-6"> <h3 class="text-2xl font-bold mb-2 group-hover:text-blue-300 transition-colors"${addAttribute(`color: ${category.color || "#ffffff"};`, "style")}> ${category.label} </h3> <p class="text-gray-200 text-sm line-clamp-2 mb-3"> ${category.shortDescription} </p> <!-- View Collection Button --> <div class="flex items-center gap-2 text-white font-medium"> <span>View Collection</span> <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path> </svg> </div> </div> <!-- Favorite Badge --> ${category.isFavorite && renderTemplate`<div class="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"> <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"> <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path> </svg> <span>Popular</span> </div>`} </div> </a> </article>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/CategoryCard.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const { env } = Astro2.locals.runtime;
  const rawCategories = await getCategories(env.DB, { isOnline: true });
  const categories = rawCategories.map(hydrateCategory);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "All Categories", "description": "Browse all recipe categories" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container mx-auto px-4 py-12"> <h1 class="text-4xl font-bold text-center mb-12">Browse Categories</h1> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"> ${categories.map((category) => renderTemplate`${renderComponent($$result2, "CategoryCard", $$CategoryCard, { "category": category })}`)} </div> </div> ` })}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/categories/index.astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/categories/index.astro";
const $$url = "/categories";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
