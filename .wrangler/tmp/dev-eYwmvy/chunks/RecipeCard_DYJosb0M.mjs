globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, m as maybeRenderHead, ag as addAttribute, a as renderTemplate } from './astro/server_Bsmdvglz.mjs';

const $$Astro = createAstro("https://localhost:4321");
const $$RecipeCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$RecipeCard;
  const { recipe } = Astro2.props;
  const recipeDetails = recipe.recipeJson;
  return renderTemplate`${maybeRenderHead()}<article class="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden
shadow-md hover:shadow-xl transition-all duration-300 transform
hover:-translate-y-1"> <a${addAttribute(recipe.route, "href")} class="block"> <!-- Recipe Image
--> <div class="relative h-48 overflow-hidden"> <img${addAttribute(recipe.imageUrl, "src")}${addAttribute(recipe.imageAlt || recipe.headline, "alt")} class="w-full h-full object-cover
group-hover:scale-110 transition-transform duration-300" loading="lazy"> <!--
Favorite Badge --> ${recipe.isFavorite && renderTemplate`<div class="absolute top-3 right-3
bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex
items-center gap-1"> ${" "} <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20
20"> ${" "} <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656
5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"></path>${" "} </svg>${" "} <span>Featured</span> </div>`} </div> <!-- Recipe Info --> <div class="p-5"> <!-- Category & Tags
--> <div class="flex items-center gap-2 mb-3"> <span class="text-xs
font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide"> ${recipe.categorySlug.replace(/-/g, " ")} </span> </div> <!-- Title --> <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2
group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"> ${recipe.headline} </h3> <!-- Description --> <p class="text-gray-600
dark:text-gray-300 text-sm mb-4 line-clamp-2"> ${recipe.shortDescription} </p> <!-- Meta Info --> <div class="flex items-center justify-between text-sm
text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700
pt-4"> ${recipeDetails?.prepTime && renderTemplate`<div class="flex items-center gap-1"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12
8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>${" "} </svg> <span>${recipeDetails.prepTime}</span>${" "} </div>`} ${recipeDetails?.servings && renderTemplate`<div class="flex items-center gap-1"> ${" "} <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> ${" "} <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15
21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018
0z"></path>${" "} </svg>${" "} <span>${recipeDetails.servings} servings</span>${" "} </div>`} </div> </div> </a> </article>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/RecipeCard.astro", void 0);

export { $$RecipeCard as $ };
