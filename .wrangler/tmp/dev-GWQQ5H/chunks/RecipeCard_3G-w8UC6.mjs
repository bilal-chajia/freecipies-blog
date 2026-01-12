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

import { c as createAstro, a as createComponent, m as maybeRenderHead, b as addAttribute, r as renderTemplate } from './astro/server_B79ahsw9.mjs';
import { e as extractImage, g as getImageSrcSet } from './hydration_PCOoIFzn.mjs';

const $$Astro = createAstro("https://localhost:4321");
const $$RecipeCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$RecipeCard;
  const { recipe } = Astro2.props;
  const recipeDetails = recipe.recipeJson;
  const thumbnail = extractImage(recipe.imagesJson, "thumbnail", 720);
  const cover = extractImage(recipe.imagesJson, "cover", 720);
  const slotName = thumbnail.imageUrl ? "thumbnail" : "cover";
  const selectedImage = thumbnail.imageUrl ? thumbnail : cover;
  const srcSet = getImageSrcSet(recipe.imagesJson, slotName);
  const sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px";
  return renderTemplate`${maybeRenderHead()}<article class="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden
shadow-md hover:shadow-xl transition-all duration-300 transform
hover:-translate-y-1"> <a${addAttribute(recipe.route, "href")} class="block"> <!-- Recipe Image
--> <div class="relative h-48 overflow-hidden"> <img${addAttribute(selectedImage.imageUrl || recipe.imageUrl, "src")}${addAttribute(selectedImage.imageAlt || recipe.imageAlt || recipe.headline, "alt")}${addAttribute(selectedImage.imageWidth || recipe.imageWidth || 720, "width")}${addAttribute(selectedImage.imageHeight || recipe.imageHeight || 480, "height")}${addAttribute(srcSet || void 0, "srcset")}${addAttribute(srcSet ? sizes : void 0, "sizes")} class="w-full h-full object-cover
group-hover:scale-110 transition-transform duration-300" loading="lazy"> <!--
Favorite Badge --> ${recipe.isFavorite && renderTemplate`<div class="absolute top-3 right-3
bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex
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
