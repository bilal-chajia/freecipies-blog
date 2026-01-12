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

import { c as createAstro, a as createComponent, m as maybeRenderHead, b as addAttribute, f as renderScript, r as renderTemplate, d as renderComponent, F as Fragment, h as defineScriptVars, i as renderSlot, u as unescapeHTML } from '../../chunks/astro/server_B79ahsw9.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DDkk2Mp3.mjs';
/* empty css                                     */
import { $ as $$PopularRecipes, a as $$NewsletterWidget } from '../../chunks/NewsletterWidget_CY-qZb0v.mjs';
import { e as extractImage, g as getImageSrcSet } from '../../chunks/hydration_PCOoIFzn.mjs';
import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { b as getArticleBySlug } from '../../chunks/articles.service_DgNeye45.mjs';
import { b as getAuthorById } from '../../chunks/authors.service_DDYOeshw.mjs';
import { g as getCategoryById } from '../../chunks/categories.service_BzGDlPlq.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro$4 = createAstro("https://localhost:4321");
const $$SocialShareBar = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$SocialShareBar;
  const {
    url = Astro2.url.href,
    title = "",
    readingTime = "5 Min Read"
  } = Astro2.props;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return renderTemplate`${maybeRenderHead()}<div class="social-share-bar" data-astro-cid-iee254wo> <div class="share-buttons" data-astro-cid-iee254wo> <a${addAttribute(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "href")} target="_blank" rel="noopener noreferrer" class="share-btn facebook" aria-label="Share on Facebook" data-astro-cid-iee254wo> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-iee254wo> <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" data-astro-cid-iee254wo></path> </svg> </a> <a${addAttribute(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, "href")} target="_blank" rel="noopener noreferrer" class="share-btn twitter" aria-label="Share on X/Twitter" data-astro-cid-iee254wo> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-iee254wo> <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" data-astro-cid-iee254wo></path> </svg> </a> <button class="share-btn copy-link"${addAttribute(url, "data-url")} aria-label="Copy link" data-astro-cid-iee254wo> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-iee254wo> <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" data-astro-cid-iee254wo></path> <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" data-astro-cid-iee254wo></path> </svg> </button> <button class="share-btn print" onclick="window.print()" aria-label="Print recipe" data-astro-cid-iee254wo> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-iee254wo> <polyline points="6 9 6 2 18 2 18 9" data-astro-cid-iee254wo></polyline> <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" data-astro-cid-iee254wo></path> <rect x="6" y="14" width="12" height="8" data-astro-cid-iee254wo></rect> </svg> </button> <span class="share-btn more" data-astro-cid-iee254wo> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-iee254wo> <circle cx="12" cy="12" r="2" data-astro-cid-iee254wo></circle> <circle cx="5" cy="12" r="2" data-astro-cid-iee254wo></circle> <circle cx="19" cy="12" r="2" data-astro-cid-iee254wo></circle> </svg> </span> </div> <div class="reading-time" data-astro-cid-iee254wo> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-iee254wo> <circle cx="12" cy="12" r="10" data-astro-cid-iee254wo></circle> <polyline points="12 6 12 12 16 14" data-astro-cid-iee254wo></polyline> </svg> <span data-astro-cid-iee254wo>${readingTime}</span> </div> </div>  ${renderScript($$result, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/SocialShareBar.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/SocialShareBar.astro", void 0);

const $$Astro$3 = createAstro("https://localhost:4321");
const $$RecipeAuthorCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$RecipeAuthorCard;
  const {
    authorName = "Freecipies Team",
    authorImage,
    authorImageSrcSet,
    authorImageSizes,
    authorImageWidth = 48,
    authorImageHeight = 48,
    authorRole = "Blogger",
    lastUpdated,
    viewCount
  } = Astro2.props;
  const hasValidImage = authorImage && authorImage.trim() !== "";
  let formattedDate = "";
  if (lastUpdated) {
    const date = typeof lastUpdated === "string" ? new Date(lastUpdated) : lastUpdated;
    if (!isNaN(date.getTime())) {
      formattedDate = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    }
  }
  const initials = authorName.split(" ").map((word) => word.charAt(0)).join("").substring(0, 2).toUpperCase();
  return renderTemplate`${maybeRenderHead()}<div class="recipe-author-card" data-astro-cid-sgl2jmkl> <a${addAttribute(`/authors/${authorName.toLowerCase().replace(/\s+/g, "-")}`, "href")} class="author-avatar" data-astro-cid-sgl2jmkl> ${hasValidImage ? renderTemplate`<img${addAttribute(authorImage, "src")}${addAttribute(authorName, "alt")}${addAttribute(authorImageWidth, "width")}${addAttribute(authorImageHeight, "height")}${addAttribute(authorImageSrcSet || void 0, "srcset")}${addAttribute(authorImageSizes || void 0, "sizes")} loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" data-astro-cid-sgl2jmkl>
            <div class="avatar-fallback" style="display: none;" data-astro-cid-sgl2jmkl> ${initials} </div>` : renderTemplate`<div class="avatar-fallback" data-astro-cid-sgl2jmkl> ${initials} </div>`} </a> <div class="author-info" data-astro-cid-sgl2jmkl> <div class="author-meta" data-astro-cid-sgl2jmkl> <span class="by-text" data-astro-cid-sgl2jmkl>By</span> <a${addAttribute(`/authors/${authorName.toLowerCase().replace(/\s+/g, "-")}`, "href")} class="author-name" data-astro-cid-sgl2jmkl> ${authorName} </a> <span class="separator" data-astro-cid-sgl2jmkl>-</span> <span class="author-role" data-astro-cid-sgl2jmkl>${authorRole}</span> </div> ${formattedDate && renderTemplate`<div class="last-updated" data-astro-cid-sgl2jmkl>
Last updated: ${formattedDate} ${viewCount !== void 0 && viewCount !== null && renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-sgl2jmkl": true }, { "default": ($$result2) => renderTemplate` <span class="separator" data-astro-cid-sgl2jmkl>•</span> <span class="view-count" data-astro-cid-sgl2jmkl>${new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(viewCount)} views</span> ` })}`} </div>`} </div> </div> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/RecipeAuthorCard.astro", void 0);

var __freeze$1 = Object.freeze;
var __defProp$1 = Object.defineProperty;
var __template$1 = (cooked, raw) => __freeze$1(__defProp$1(cooked, "raw", { value: __freeze$1(raw || cooked.slice()) }));
var _a$1;
const $$Astro$2 = createAstro("https://localhost:4321");
const $$RecipeLayout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$RecipeLayout;
  const { recipe, author, category } = Astro2.props;
  const categoryColor = category?.color || "#ff6600";
  const recipeJson = recipe.recipeJson ? typeof recipe.recipeJson === "string" ? JSON.parse(recipe.recipeJson) : recipe.recipeJson : null;
  const wordCount = [
    recipe.shortDescription,
    recipe.tldr,
    recipe.introduction,
    JSON.stringify(recipeJson?.ingredients || []),
    JSON.stringify(recipeJson?.instructions || [])
  ].filter(Boolean).join(" ").split(/\s+/).length;
  const readingTime = Math.max(5, Math.ceil(wordCount / 200));
  const heroCover = extractImage(recipe.imagesJson, "cover", 1200);
  const heroThumb = extractImage(recipe.imagesJson, "thumbnail", 1200);
  const coverSrcSet = getImageSrcSet(recipe.imagesJson, "cover");
  const thumbSrcSet = getImageSrcSet(recipe.imagesJson, "thumbnail");
  const useCover = heroCover.imageUrl && (coverSrcSet || !heroThumb.imageUrl);
  const heroImage = useCover ? heroCover : heroThumb;
  const heroSrcSet = useCover ? coverSrcSet : thumbSrcSet;
  const heroSizes = "(max-width: 768px) 90vw, 800px";
  const authorAvatar = author?.imagesJson ? extractImage(author.imagesJson, "avatar", 96) : {};
  const authorAvatarSrcSet = author?.imagesJson ? getImageSrcSet(author.imagesJson, "avatar") : "";
  const authorAvatarSizes = authorAvatarSrcSet ? "48px" : void 0;
  const authorImage = authorAvatar.imageUrl || author?.imageUrl;
  const authorImageWidth = authorAvatar.imageWidth || 48;
  const authorImageHeight = authorAvatar.imageHeight || 48;
  return renderTemplate(_a$1 || (_a$1 = __template$1(["", " <script>(function(){", '\n  // Simple view tracking\n  const trackView = async () => {\n    try {\n      await fetch(`/api/views/${slug}`, { method: "POST" });\n    } catch (e) {\n      // Ignore errors silently (e.g. ad blockers)\n    }\n  };\n\n  // Run when the page is ready\n  if (document.readyState === "complete") {\n    trackView();\n  } else {\n    window.addEventListener("load", trackView);\n  }\n})();<\/script>  ', ""], ["", " <script>(function(){", '\n  // Simple view tracking\n  const trackView = async () => {\n    try {\n      await fetch(\\`/api/views/\\${slug}\\`, { method: "POST" });\n    } catch (e) {\n      // Ignore errors silently (e.g. ad blockers)\n    }\n  };\n\n  // Run when the page is ready\n  if (document.readyState === "complete") {\n    trackView();\n  } else {\n    window.addEventListener("load", trackView);\n  }\n})();<\/script>  ', ""])), renderComponent($$result, "Layout", $$Layout, { "title": recipe.metaTitle || recipe.label, "description": recipe.metaDescription || recipe.shortDescription, "image": heroImage.imageUrl || recipe.imageUrl || void 0, "data-astro-cid-763jalmv": true }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<article class="recipe-page" data-astro-cid-763jalmv> <div class="recipe-container" data-astro-cid-763jalmv> <!-- Main Content Column --> <div class="main-content" data-astro-cid-763jalmv> <!-- Category Badge --> ${recipe.categoryLabel && renderTemplate`<a${addAttribute(`/categories/${recipe.categorySlug}`, "href")} class="category-badge"${addAttribute(`--badge-color: ${categoryColor};`, "style")} data-astro-cid-763jalmv> ${recipe.categoryLabel} </a>`} <!-- Recipe Title --> <h1 class="recipe-title" data-astro-cid-763jalmv>${recipe.label}</h1> <!-- Short Description --> ${recipe.shortDescription && renderTemplate`<p class="recipe-description" data-astro-cid-763jalmv>${recipe.shortDescription}</p>`} <!-- Social Share Bar --> ${renderComponent($$result2, "SocialShareBar", $$SocialShareBar, { "title": recipe.label, "readingTime": `${readingTime} Min Read`, "data-astro-cid-763jalmv": true })} <!-- Author Card --> ${renderComponent($$result2, "RecipeAuthorCard", $$RecipeAuthorCard, { "authorName": author?.name || recipe.authorName, "authorImage": authorImage || void 0, "authorImageSrcSet": authorAvatarSrcSet || void 0, "authorImageSizes": authorAvatarSizes, "authorImageWidth": authorImageWidth, "authorImageHeight": authorImageHeight, "authorRole": author?.job || "Blogger", "lastUpdated": recipe.publishedAt || void 0, "viewCount": recipe.viewCount, "data-astro-cid-763jalmv": true })} <!-- Disclosure Notice --> <div class="disclosure-notice" data-astro-cid-763jalmv> <strong data-astro-cid-763jalmv>Disclosure:</strong> This website may contain affiliate links, which
          means I may earn a commission if you click on the link and make a purchase.
          I only recommend products or services that I personally use and believe
          will add value to my readers. Your support is appreciated!
</div> <!-- Hero Image --> ${(heroImage.imageUrl || recipe.imageUrl) && renderTemplate`<div class="hero-image" data-astro-cid-763jalmv> <img${addAttribute(heroImage.imageUrl || recipe.imageUrl, "src")}${addAttribute(heroImage.imageAlt || recipe.imageAlt || recipe.label, "alt")}${addAttribute(heroImage.imageWidth || recipe.imageWidth, "width")}${addAttribute(heroImage.imageHeight || recipe.imageHeight, "height")}${addAttribute(heroSrcSet || void 0, "srcset")}${addAttribute(heroSrcSet ? heroSizes : void 0, "sizes")} loading="eager" fetchpriority="high" decoding="async" data-astro-cid-763jalmv> </div>`} <!-- Recipe Meta Info Pills --> ${recipeJson && renderTemplate`<div class="recipe-meta-pills" data-astro-cid-763jalmv> ${recipeJson.prepTime && renderTemplate`<div class="meta-pill" data-astro-cid-763jalmv> <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-763jalmv> <circle cx="12" cy="12" r="10" data-astro-cid-763jalmv></circle> <polyline points="12 6 12 12 16 14" data-astro-cid-763jalmv></polyline> </svg> <span class="label" data-astro-cid-763jalmv>Prep</span> <span class="value" data-astro-cid-763jalmv>${recipeJson.prepTime}</span> </div>`} ${recipeJson.cookTime && renderTemplate`<div class="meta-pill" data-astro-cid-763jalmv> <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-763jalmv> <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" data-astro-cid-763jalmv></path> </svg> <span class="label" data-astro-cid-763jalmv>Cook</span> <span class="value" data-astro-cid-763jalmv>${recipeJson.cookTime}</span> </div>`} ${recipeJson.servings && renderTemplate`<div class="meta-pill" data-astro-cid-763jalmv> <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-763jalmv> <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" data-astro-cid-763jalmv></path> <circle cx="9" cy="7" r="4" data-astro-cid-763jalmv></circle> <path d="M23 21v-2a4 4 0 0 0-3-3.87" data-astro-cid-763jalmv></path> <path d="M16 3.13a4 4 0 0 1 0 7.75" data-astro-cid-763jalmv></path> </svg> <span class="label" data-astro-cid-763jalmv>Servings</span> <span class="value" data-astro-cid-763jalmv>${recipeJson.servings}</span> </div>`} ${recipeJson.difficulty && renderTemplate`<div class="meta-pill" data-astro-cid-763jalmv> <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-763jalmv> <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" data-astro-cid-763jalmv></polygon> </svg> <span class="label" data-astro-cid-763jalmv>Level</span> <span class="value" data-astro-cid-763jalmv>${recipeJson.difficulty}</span> </div>`} </div>`} <!-- TLDR / Quick Overview --> ${recipe.tldr && renderTemplate`<section class="content-section tldr-section" data-astro-cid-763jalmv> <h2 data-astro-cid-763jalmv>Quick Overview</h2> <div class="prose" data-astro-cid-763jalmv>${unescapeHTML(recipe.tldr)}</div> </section>`} <!-- Ingredients --> ${recipeJson?.ingredients && Array.isArray(recipeJson.ingredients) && recipeJson.ingredients.length > 0 && renderTemplate`<section class="content-section ingredients-section" data-astro-cid-763jalmv> <h2 data-astro-cid-763jalmv>Ingredients</h2> ${recipeJson.ingredients.map(
    (group) => renderTemplate`<div class="ingredient-group" data-astro-cid-763jalmv> ${group.group && renderTemplate`<h3 data-astro-cid-763jalmv>${group.group}</h3>`} <ul class="ingredient-list" data-astro-cid-763jalmv> ${group.items && Array.isArray(group.items) && group.items.map((item) => renderTemplate`<li data-astro-cid-763jalmv> <span class="checkbox" data-astro-cid-763jalmv></span> <span data-astro-cid-763jalmv>${item}</span> </li>`)} </ul> </div>`
  )} </section>`} <!-- Instructions --> ${recipeJson?.instructions && Array.isArray(recipeJson.instructions) && recipeJson.instructions.length > 0 && renderTemplate`<section class="content-section instructions-section" data-astro-cid-763jalmv> <h2 data-astro-cid-763jalmv>Instructions</h2> ${recipeJson.instructions.map(
    (group) => renderTemplate`<div class="instruction-group" data-astro-cid-763jalmv> ${group.group && renderTemplate`<h3 data-astro-cid-763jalmv>${group.group}</h3>`} <ol class="instruction-list" data-astro-cid-763jalmv> ${group.steps && Array.isArray(group.steps) && group.steps.map((step, index) => renderTemplate`<li data-astro-cid-763jalmv> <span class="step-number" data-astro-cid-763jalmv>${index + 1}</span> <p data-astro-cid-763jalmv>${step}</p> </li>`)} </ol> </div>`
  )} </section>`} <!-- Nutrition Facts (inline for mobile) --> ${recipeJson?.nutrition && Object.keys(recipeJson.nutrition).length > 0 && renderTemplate`<section class="content-section nutrition-section mobile-only" data-astro-cid-763jalmv> <h2 data-astro-cid-763jalmv>Nutrition Facts</h2> <div class="nutrition-grid" data-astro-cid-763jalmv> ${Object.entries(recipeJson.nutrition).map(([key, value]) => renderTemplate`<div class="nutrition-item" data-astro-cid-763jalmv> <span class="nutrition-value" data-astro-cid-763jalmv>${value}</span> <span class="nutrition-label" data-astro-cid-763jalmv>${key}</span> </div>`)} </div> </section>`} <!-- FAQs --> ${recipe.faqsJson && Array.isArray(recipe.faqsJson) && recipe.faqsJson.length > 0 && renderTemplate`<section class="content-section faqs-section" data-astro-cid-763jalmv> <h2 data-astro-cid-763jalmv>Frequently Asked Questions</h2> <div class="faq-list" data-astro-cid-763jalmv> ${recipe.faqsJson.map((faq) => renderTemplate`<details class="faq-item" data-astro-cid-763jalmv> <summary data-astro-cid-763jalmv>${faq.question}</summary> <div class="faq-answer" data-astro-cid-763jalmv>${unescapeHTML(faq.answer)}</div> </details>`)} </div> </section>`} </div> <!-- Sidebar --> <aside class="sidebar" data-astro-cid-763jalmv> <div class="sidebar-sticky" data-astro-cid-763jalmv> <!-- Nutrition Facts (desktop) --> ${recipeJson?.nutrition && Object.keys(recipeJson.nutrition).length > 0 && renderTemplate`<div class="sidebar-widget nutrition-widget desktop-only" data-astro-cid-763jalmv> <h3 data-astro-cid-763jalmv>Nutrition Facts</h3> <div class="nutrition-list" data-astro-cid-763jalmv> ${Object.entries(recipeJson.nutrition).map(
    ([key, value]) => renderTemplate`<div class="nutrition-row" data-astro-cid-763jalmv> <span class="nutrition-key" data-astro-cid-763jalmv>${key}</span> <span class="nutrition-val" data-astro-cid-763jalmv>${value}</span> </div>`
  )} </div> </div>`} <!-- Popular Recipes --> ${renderComponent($$result2, "PopularRecipes", $$PopularRecipes, { "currentSlug": recipe.slug, "limit": 5, "data-astro-cid-763jalmv": true })} <!-- Newsletter Widget --> ${renderComponent($$result2, "NewsletterWidget", $$NewsletterWidget, { "data-astro-cid-763jalmv": true })} </div> </aside> </div> </article> `, "head": async ($$result2) => renderTemplate`${renderSlot($$result2, $$slots["head"])}${(heroImage.imageUrl || recipe.imageUrl) && renderTemplate`<link rel="preload" as="image"${addAttribute(heroImage.imageUrl || recipe.imageUrl, "href")}${addAttribute(heroSrcSet || void 0, "imagesrcset")}${addAttribute(heroSrcSet ? heroSizes : void 0, "imagesizes")} fetchpriority="high">`}` }), defineScriptVars({ slug: recipe.slug }), renderScript($$result, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/layouts/RecipeLayout.astro?astro&type=script&index=0&lang.ts"));
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/layouts/RecipeLayout.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a, _b, _c;
const $$Astro$1 = createAstro("https://localhost:4321");
const $$SEO = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$SEO;
  const {
    title,
    description,
    canonical,
    image,
    imageAlt,
    type = "website",
    publishedTime,
    modifiedTime,
    author,
    recipe
  } = Astro2.props;
  const siteUrl = Astro2.site?.toString() || Astro2.url.origin;
  const canonicalURL = canonical || new URL(Astro2.url.pathname, siteUrl).toString();
  const imageUrl = image ? new URL(image, siteUrl).toString() : `${siteUrl}/og-image.jpg`;
  const recipeImageUrl = recipe?.image ? new URL(recipe.image, siteUrl).toString() : imageUrl;
  return renderTemplate`<!-- Structured data only; BaseHead handles standard meta tags. --><!-- Schema.org JSON-LD -->${type === "website" && renderTemplate(_a || (_a = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Freecipies",
    "description": description,
    "url": siteUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  })))}${type === "article" && author && renderTemplate(_b || (_b = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "image": imageUrl,
    "datePublished": publishedTime,
    "dateModified": modifiedTime || publishedTime,
    "author": {
      "@type": "Person",
      "name": author.name,
      "url": author.url
    },
    "publisher": {
      "@type": "Organization",
      "name": "Freecipies",
      "logo": {
        "@type": "ImageObject",
        "url": `${siteUrl}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalURL
    }
  })))}${type === "recipe" && recipe && renderTemplate(_c || (_c = __template(['<script type="application/ld+json">', "<\/script>"])), unescapeHTML(JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": recipe.name,
    "description": recipe.description,
    "image": recipeImageUrl,
    "author": author ? {
      "@type": "Person",
      "name": author.name
    } : void 0,
    "datePublished": publishedTime,
    "dateModified": modifiedTime || publishedTime,
    "prepTime": recipe.prepTime,
    "cookTime": recipe.cookTime,
    "totalTime": recipe.totalTime,
    "recipeYield": recipe.recipeYield,
    "recipeCategory": recipe.recipeCategory,
    "recipeCuisine": recipe.recipeCuisine,
    "keywords": recipe.keywords?.join(", "),
    "recipeIngredient": recipe.recipeIngredient,
    "recipeInstructions": recipe.recipeInstructions?.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "text": typeof step === "string" ? step : step.text
    })),
    "nutrition": recipe.nutrition ? {
      "@type": "NutritionInformation",
      "calories": recipe.nutrition.calories ? `${recipe.nutrition.calories} kcal` : void 0,
      "proteinContent": recipe.nutrition.proteinContent ? `${recipe.nutrition.proteinContent} g` : void 0,
      "fatContent": recipe.nutrition.fatContent ? `${recipe.nutrition.fatContent} g` : void 0,
      "carbohydrateContent": recipe.nutrition.carbohydrateContent ? `${recipe.nutrition.carbohydrateContent} g` : void 0,
      "sugarContent": recipe.nutrition.sugarContent ? `${recipe.nutrition.sugarContent} g` : void 0,
      "fiberContent": recipe.nutrition.fiberContent ? `${recipe.nutrition.fiberContent} g` : void 0,
      "sodiumContent": recipe.nutrition.sodiumContent ? `${recipe.nutrition.sodiumContent} mg` : void 0
    } : void 0,
    "aggregateRating": recipe.aggregateRating ? {
      "@type": "AggregateRating",
      "ratingValue": recipe.aggregateRating.ratingValue,
      "ratingCount": recipe.aggregateRating.reviewCount ?? recipe.aggregateRating.ratingCount
    } : void 0
  })))}<!-- Breadcrumb Schema -->${renderSlot($$result, $$slots["breadcrumb-schema"])}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/SEO.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const { runtime } = Astro2.locals;
  if (!slug) {
    return new Response("Slug is missing", { status: 400 });
  }
  let author = null;
  let category = null;
  const recipe = await getArticleBySlug(runtime.env.DB, slug, "recipe");
  if (!recipe) {
    return new Response("Recipe not found", { status: 404 });
  }
  const recipeDetails = recipe.recipeJson || void 0;
  const heroCover = extractImage(recipe.imagesJson, "cover", 1200);
  const heroThumb = extractImage(recipe.imagesJson, "thumbnail", 1200);
  const coverSrcSet = getImageSrcSet(recipe.imagesJson, "cover");
  getImageSrcSet(recipe.imagesJson, "thumbnail");
  const useCover = heroCover.imageUrl && (coverSrcSet || !heroThumb.imageUrl);
  const heroImage = useCover ? heroCover : heroThumb;
  if (recipe.authorId) {
    author = await getAuthorById(runtime.env.DB, recipe.authorId);
  }
  if (recipe.categoryId) {
    category = await getCategoryById(runtime.env.DB, recipe.categoryId);
  }
  const pageTitle = recipe.metaTitle || recipe.headline;
  const pageDescription = recipe.metaDescription || recipe.shortDescription;
  return renderTemplate`${renderComponent($$result, "RecipeLayout", $$RecipeLayout, { "recipe": recipe, "author": author, "category": category }, { "default": async ($$result2) => renderTemplate`   ${maybeRenderHead()}<article> <h1 class="text-4xl font-bold mb-4">${recipe.headline}</h1> <p class="text-lg text-gray-600 mb-8">${recipe.shortDescription}</p> ${recipeDetails ? renderTemplate`<div class="prose prose-lg max-w-none"> <div class="mb-8"> <h2 class="text-2xl font-semibold border-b pb-2 mb-4">
Ingredients
</h2> <ul> ${recipeDetails.ingredients?.map((group) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`${group.group_title && renderTemplate`<h3 class="font-bold mt-2">${group.group_title}</h3>`}${group.items && group.items.map((item) => renderTemplate`<li> ${item.name} ${item.amount ? ` - ${item.amount}${item.unit || ""}` : ""} </li>`)}` })}`)} </ul> </div> <div> <h2 class="text-2xl font-semibold border-b pb-2 mb-4">
Instructions
</h2> <ol> ${recipeDetails.instructions?.map((group) => renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`${group.section_title && renderTemplate`<h3 class="font-bold mt-2">${group.section_title}</h3>`}${group.steps && group.steps.map((step) => renderTemplate`<li>${step.text}</li>`)}` })}`)} </ol> </div> </div>` : renderTemplate`<p class="text-center text-gray-500 italic mt-12">
This article does not contain detailed recipe information.
</p>`} </article> `, "head": async ($$result2) => renderTemplate`${renderComponent($$result2, "SEO", $$SEO, { "slot": "head", "title": pageTitle, "description": pageDescription, "type": "recipe", "publishedTime": recipe.publishedAt || void 0, "author": { name: author?.name || "Freecipies Team" }, "image": heroImage.imageUrl || recipe.imageUrl || "", "imageAlt": heroImage.imageAlt || recipe.imageAlt || void 0, "recipe": recipeDetails ? {
    name: recipe.headline,
    description: recipe.shortDescription,
    image: heroImage.imageUrl || recipe.imageUrl || "",
    prepTime: recipeDetails.prepTime ? String(recipeDetails.prepTime) : void 0,
    cookTime: recipeDetails.cookTime ? String(recipeDetails.cookTime) : void 0,
    totalTime: void 0,
    recipeYield: recipeDetails.servings ? String(recipeDetails.servings) : void 0,
    recipeCategory: category?.label,
    recipeIngredient: recipeDetails.ingredients?.flatMap(
      (i) => i.items.map((item) => item.name)
    ) || [],
    recipeInstructions: recipeDetails.instructions?.flatMap(
      (i) => i.steps.map((step) => step.text)
    ) || []
  } : void 0 })}` })}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/recipes/[slug].astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/recipes/[slug].astro";
const $$url = "/recipes/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$slug,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
