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

import { c as createAstro, a as createComponent, m as maybeRenderHead, b as addAttribute, r as renderTemplate, d as renderComponent, F as Fragment, u as unescapeHTML } from '../../chunks/astro/server_B79ahsw9.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DDkk2Mp3.mjs';
import { e as extractImage, g as getImageSrcSet, b as hydrateCategories } from '../../chunks/hydration_PCOoIFzn.mjs';
/* empty css                                     */
import { $ as $$PopularRecipes, a as $$NewsletterWidget } from '../../chunks/NewsletterWidget_CY-qZb0v.mjs';
import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { e as getCategories } from '../../chunks/categories.service_BzGDlPlq.mjs';
import { c as getArticles } from '../../chunks/articles.service_DgNeye45.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro$6 = createAstro("https://localhost:4321");
const $$CategoryHeader = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$CategoryHeader;
  const {
    category,
    featuredArticle = null,
    headerStyle = "hero"
  } = Astro2.props;
  const showHeader = headerStyle !== "none";
  const isHeroHeader = headerStyle === "hero";
  const isMinimalHeader = headerStyle === "minimal";
  const hasFeatured = Boolean(featuredArticle && isHeroHeader);
  const getFeaturedImage = (article) => {
    const cover = extractImage(article.imagesJson, "cover", 1200);
    const thumbnail = extractImage(article.imagesJson, "thumbnail", 1200);
    const slotName = cover.imageUrl ? "cover" : "thumbnail";
    const selected = cover.imageUrl ? cover : thumbnail;
    const srcSet = getImageSrcSet(article.imagesJson, slotName);
    return { selected, srcSet };
  };
  const featuredRecipe = featuredArticle?.recipeJson ?? null;
  const featuredImage = featuredArticle ? getFeaturedImage(featuredArticle) : null;
  const featuredSizes = "(max-width: 1024px) 100vw, 50vw";
  return renderTemplate`${showHeader && renderTemplate`${maybeRenderHead()}<section${addAttribute(["category-hero", { "is-minimal": isMinimalHeader }], "class:list")} data-astro-cid-hp6dm2g2><div${addAttribute(["hero-container", { "has-featured": hasFeatured, "is-minimal": isMinimalHeader }], "class:list")} data-astro-cid-hp6dm2g2>${isHeroHeader && featuredArticle && featuredImage && renderTemplate`<a${addAttribute(`/recipes/${featuredArticle.slug}`, "href")} class="featured-card" data-astro-cid-hp6dm2g2><div class="featured-image" data-astro-cid-hp6dm2g2>${(featuredImage.selected.imageUrl || featuredArticle.imageUrl) && renderTemplate`<img${addAttribute(featuredImage.selected.imageUrl || featuredArticle.imageUrl, "src")}${addAttribute(featuredImage.selected.imageAlt || featuredArticle.imageAlt || featuredArticle.label, "alt")}${addAttribute(featuredImage.selected.imageWidth || featuredArticle.imageWidth || 1200, "width")}${addAttribute(featuredImage.selected.imageHeight || featuredArticle.imageHeight || 900, "height")}${addAttribute(featuredImage.srcSet || void 0, "srcset")}${addAttribute(featuredImage.srcSet ? featuredSizes : void 0, "sizes")} loading="eager" data-astro-cid-hp6dm2g2>`}<div class="featured-overlay" data-astro-cid-hp6dm2g2><span class="featured-badge" data-astro-cid-hp6dm2g2>${category.label}</span><h2 class="featured-title" data-astro-cid-hp6dm2g2>${featuredArticle.label}</h2><div class="featured-meta" data-astro-cid-hp6dm2g2>${featuredRecipe?.cookTime && renderTemplate`<span data-astro-cid-hp6dm2g2>${featuredRecipe.cookTime}</span>`}</div></div></div></a>`}<div${addAttribute(["hero-content", { "is-minimal": isMinimalHeader }], "class:list")} data-astro-cid-hp6dm2g2><h1 class="category-title" data-astro-cid-hp6dm2g2>${category.headline || category.label}</h1><p class="category-description" data-astro-cid-hp6dm2g2>${category.shortDescription || category.headline}</p>${category.tldr && renderTemplate`<p class="category-tldr" data-astro-cid-hp6dm2g2>${category.tldr}</p>`}${isHeroHeader && renderTemplate`<a href="#newsletter" class="cta-button" data-astro-cid-hp6dm2g2> Join My Mailing List </a>`}</div></div></section>`}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/CategoryHeader.astro", void 0);

const $$Astro$5 = createAstro("https://localhost:4321");
const $$FormattedDate = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$FormattedDate;
  const { date } = Astro2.props;
  if (!date) {
    return null;
  }
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  return renderTemplate`${maybeRenderHead()}<time${addAttribute(dateObj.toISOString(), "datetime")}> ${dateObj.toLocaleDateString("en-us", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })} </time>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/FormattedDate.astro", void 0);

const $$Astro$4 = createAstro("https://localhost:4321");
const $$ArticleCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$ArticleCard;
  const { article, loading = "lazy", cardStyle = "full", layoutMode = "grid" } = Astro2.props;
  const isCompact = cardStyle === "compact";
  const isMinimal = cardStyle === "minimal";
  const isList = layoutMode === "list";
  const thumbnail = extractImage(article.imagesJson, "thumbnail", 720);
  const cover = extractImage(article.imagesJson, "cover", 720);
  const slotName = thumbnail.imageUrl ? "thumbnail" : "cover";
  const selected = thumbnail.imageUrl ? thumbnail : cover;
  const srcSet = getImageSrcSet(article.imagesJson, slotName);
  const sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px";
  const listSizes = "(max-width: 768px) 100vw, 320px";
  const image = {
    url: selected.imageUrl || article.imageUrl || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80",
    alt: selected.imageAlt || article.imageAlt || article.headline,
    width: selected.imageWidth || article.imageWidth || 800,
    height: selected.imageHeight || article.imageHeight || 600
  };
  const recipe = article.recipeJson ? typeof article.recipeJson === "string" ? JSON.parse(article.recipeJson) : article.recipeJson : null;
  const ratingValue = recipe?.aggregateRating?.ratingValue ?? null;
  const ratingCount = recipe?.aggregateRating?.ratingCount ?? 0;
  const normalizedRating = ratingValue ? Math.max(0, Math.min(5, ratingValue)) : 0;
  const hasRating = ratingValue !== null && ratingCount > 0;
  const authorLabel = article.authorName || article.authorSlug || "Unknown";
  const ratingStars = Array.from({ length: 5 });
  return renderTemplate`${isList ? renderTemplate`${maybeRenderHead()}<article class="recipe-list-card" data-astro-cid-di2nlc57><a${addAttribute(article.route, "href")} class="list-image" data-astro-cid-di2nlc57><img${addAttribute(image.url, "src")}${addAttribute(image.alt || article.headline, "alt")}${addAttribute(image.width, "width")}${addAttribute(image.height, "height")}${addAttribute(srcSet || void 0, "srcset")}${addAttribute(srcSet ? listSizes : void 0, "sizes")}${addAttribute(loading, "loading")} class="list-image-img" data-astro-cid-di2nlc57></a><div class="list-content" data-astro-cid-di2nlc57><h3 class="list-title" data-astro-cid-di2nlc57>${article.headline}</h3><div class="list-divider" data-astro-cid-di2nlc57></div><p class="list-excerpt" data-astro-cid-di2nlc57>${article.shortDescription}</p><div class="list-meta" data-astro-cid-di2nlc57><div class="list-meta-left" data-astro-cid-di2nlc57><span class="meta-item" data-astro-cid-di2nlc57><svg viewBox="0 0 24 24" aria-hidden="true" data-astro-cid-di2nlc57><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" data-astro-cid-di2nlc57></path></svg><span data-astro-cid-di2nlc57>${authorLabel}</span></span><span class="meta-item" data-astro-cid-di2nlc57><svg viewBox="0 0 24 24" aria-hidden="true" data-astro-cid-di2nlc57><path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm12 8H5v8h14z" data-astro-cid-di2nlc57></path></svg>${renderComponent($$result, "FormattedDate", $$FormattedDate, { "date": article.publishedAt || article.createdAt, "data-astro-cid-di2nlc57": true })}</span></div>${hasRating && renderTemplate`<div class="list-rating" data-astro-cid-di2nlc57><div class="list-stars" data-astro-cid-di2nlc57>${ratingStars.map((_, index) => renderTemplate`<svg${addAttribute(["rating-star", { "is-active": normalizedRating >= index + 1 }], "class:list")} viewBox="0 0 24 24" aria-hidden="true" data-astro-cid-di2nlc57><path d="M12 2l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77 5.82 21l1.18-6.87-5-4.87 6.91-1L12 2z" data-astro-cid-di2nlc57></path></svg>`)}</div><span class="rating-text" data-astro-cid-di2nlc57>${normalizedRating.toFixed(1)}/5</span></div>`}</div></div></article>` : renderTemplate`<article class="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md
hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex
flex-col h-full" data-astro-cid-di2nlc57><a${addAttribute(article.route, "href")} class="block relative aspect-video
overflow-hidden" data-astro-cid-di2nlc57><!-- Image --><img${addAttribute(image.url, "src")}${addAttribute(image.alt || article.headline, "alt")}${addAttribute(image.width, "width")}${addAttribute(image.height, "height")}${addAttribute(srcSet || void 0, "srcset")}${addAttribute(srcSet ? sizes : void 0, "sizes")}${addAttribute(loading, "loading")} class="w-full h-full object-cover group-hover:scale-110
transition-transform duration-500" data-astro-cid-di2nlc57><!-- Favorite Badge -->${article.isFavorite && renderTemplate`<div class="absolute top-3 right-3 bg-red-600 text-white
px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 z-10" data-astro-cid-di2nlc57>${" "}<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" data-astro-cid-di2nlc57>${" "}<path d="M3.172
5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10
17.657l-6.828-6.829a4 4 0 010-5.656z" data-astro-cid-di2nlc57></path>${" "}</svg>${" "}<span data-astro-cid-di2nlc57>Featured</span>${" "}</div>`}<!-- Overlay --><div class="absolute inset-0 bg-gradient-to-t from-black/60
to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300
flex items-end p-4" data-astro-cid-di2nlc57><span class="text-white font-medium" data-astro-cid-di2nlc57>Read More</span></div></a><!-- Info --><div${addAttribute([
    "flex-grow flex flex-col",
    isMinimal || isCompact ? "p-4" : "p-5"
  ], "class:list")} data-astro-cid-di2nlc57><!--
Category --><div${addAttribute([
    "flex items-center gap-2",
    isMinimal || isCompact ? "mb-2" : "mb-3"
  ], "class:list")} data-astro-cid-di2nlc57><span class="text-xs
font-semibold uppercase tracking-wide"${addAttribute(`color: ${article.categoryColor || "#2563eb"}`, "style")} data-astro-cid-di2nlc57>${article.categoryLabel || article.categorySlug?.replace(/-/g, " ") || "Uncategorized"}</span></div><!-- Title --><h3${addAttribute([
    "font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
    isMinimal || isCompact ? "text-lg mb-1" : "text-xl mb-2"
  ], "class:list")} data-astro-cid-di2nlc57>${article.headline}</h3><!-- Description -->${!isMinimal && renderTemplate`<p${addAttribute([
    "text-gray-600 dark:text-gray-300 line-clamp-2 flex-grow",
    isCompact ? "text-xs mb-3" : "text-sm mb-4"
  ], "class:list")} data-astro-cid-di2nlc57>${article.shortDescription}</p>`}<!-- Meta Info -->${!isMinimal && renderTemplate`<div${addAttribute([
    "flex items-center justify-between text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto",
    isCompact ? "text-xs" : "text-sm"
  ], "class:list")} data-astro-cid-di2nlc57><div class="flex items-center gap-1" data-astro-cid-di2nlc57><span data-astro-cid-di2nlc57>${new Date(
    article.publishedAt || article.createdAt || (/* @__PURE__ */ new Date()).toISOString()
  ).toLocaleDateString()}</span></div>${recipe && renderTemplate`<div class="flex items-center gap-1" data-astro-cid-di2nlc57>${" "}<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-di2nlc57>${" "}<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0
0118 0z" data-astro-cid-di2nlc57></path>${" "}</svg>${" "}<span data-astro-cid-di2nlc57>${recipe?.prepTime || "N/A"}</span>${" "}</div>`}</div>`}</div></article>`}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/ArticleCard.astro", void 0);

const $$Astro$3 = createAstro("https://localhost:4321");
const $$ArticleGrid = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$ArticleGrid;
  const { articles, layoutMode = "grid", cardStyle = "full" } = Astro2.props;
  const layoutClass = layoutMode === "list" ? "recipe-list" : layoutMode === "masonry" ? "recipe-masonry" : "recipe-grid";
  return renderTemplate`${maybeRenderHead()}<div${addAttribute([layoutClass, `card-style-${cardStyle}`], "class:list")} data-astro-cid-synqgp74> ${articles.map((article) => renderTemplate`${renderComponent($$result, "ArticleCard", $$ArticleCard, { "article": article, "cardStyle": cardStyle, "layoutMode": layoutMode, "data-astro-cid-synqgp74": true })}`)} </div> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/ArticleGrid.astro", void 0);

const $$Astro$2 = createAstro("https://localhost:4321");
const $$Pagination = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Pagination;
  const { currentPage, totalPages, baseUrl, preserveParams = {} } = Astro2.props;
  const buildPageUrl = (page) => {
    const params = new URLSearchParams(preserveParams);
    if (page > 1) params.set("page", String(page));
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };
  const getPageNumbers = () => {
    const pages2 = [];
    const showPages = 5;
    if (totalPages <= showPages + 2) {
      for (let i = 1; i <= totalPages; i++) pages2.push(i);
    } else {
      pages2.push(1);
      if (currentPage > 3) pages2.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages2.push(i);
      if (currentPage < totalPages - 2) pages2.push("ellipsis");
      pages2.push(totalPages);
    }
    return pages2;
  };
  const pages = getPageNumbers();
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  return renderTemplate`${totalPages > 1 && renderTemplate`${maybeRenderHead()}<nav class="pagination" aria-label="Pagination" data-astro-cid-d776pwuy><a${addAttribute(hasPrev ? buildPageUrl(currentPage - 1) : void 0, "href")}${addAttribute(["pagination-btn", "prev", { disabled: !hasPrev }], "class:list")}${addAttribute(!hasPrev, "aria-disabled")} data-astro-cid-d776pwuy><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-d776pwuy><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" data-astro-cid-d776pwuy></path></svg><span class="sr-only" data-astro-cid-d776pwuy>Previous</span></a><div class="pagination-pages" data-astro-cid-d776pwuy>${pages.map((page) => page === "ellipsis" ? renderTemplate`<span class="pagination-ellipsis" data-astro-cid-d776pwuy>…</span>` : renderTemplate`<a${addAttribute(buildPageUrl(page), "href")}${addAttribute(["pagination-page", { active: page === currentPage }], "class:list")}${addAttribute(page === currentPage ? "page" : void 0, "aria-current")} data-astro-cid-d776pwuy>${page}</a>`)}</div><a${addAttribute(hasNext ? buildPageUrl(currentPage + 1) : void 0, "href")}${addAttribute(["pagination-btn", "next", { disabled: !hasNext }], "class:list")}${addAttribute(!hasNext, "aria-disabled")} data-astro-cid-d776pwuy><span class="sr-only" data-astro-cid-d776pwuy>Next</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-d776pwuy><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" data-astro-cid-d776pwuy></path></svg></a></nav>`}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/Pagination.astro", void 0);

const $$Astro$1 = createAstro("https://localhost:4321");
const $$Breadcrumb = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Breadcrumb;
  const { items } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<nav class="breadcrumb" aria-label="Fil d'ariane" data-astro-cid-qaanghzh> <ol class="breadcrumb-list" data-astro-cid-qaanghzh> <li class="breadcrumb-item" data-astro-cid-qaanghzh> <a href="/" class="breadcrumb-link" data-astro-cid-qaanghzh> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-qaanghzh> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" data-astro-cid-qaanghzh></path> </svg> <span class="sr-only" data-astro-cid-qaanghzh>Accueil</span> </a> </li> ${items.map((item, index) => renderTemplate`<li class="breadcrumb-item" data-astro-cid-qaanghzh> <svg class="breadcrumb-separator" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-astro-cid-qaanghzh> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" data-astro-cid-qaanghzh></path> </svg> ${item.href && index < items.length - 1 ? renderTemplate`<a${addAttribute(item.href, "href")} class="breadcrumb-link" data-astro-cid-qaanghzh>${item.label}</a>` : renderTemplate`<span class="breadcrumb-current" aria-current="page" data-astro-cid-qaanghzh>${item.label}</span>`} </li>`)} </ol> </nav> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/Breadcrumb.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  const { env } = Astro2.locals.runtime;
  if (!slug) {
    return Astro2.redirect("/404");
  }
  const url = new URL(Astro2.request.url);
  const currentPage = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const allRawCategories = await getCategories(env.DB, { isOnline: true });
  const allCategories = hydrateCategories(allRawCategories);
  const category = allCategories.find((c) => c.slug === slug);
  if (!category) {
    return Astro2.redirect("/404");
  }
  const perPage = category.numEntriesPerPage || 12;
  const sortBy = category.sortBy || "publishedAt";
  const sortOrder = category.sortOrder || "desc";
  const layoutMode = category.layoutMode || "grid";
  const showPagination = category.showPagination !== false;
  const showBreadcrumb = category.showBreadcrumb !== false;
  const showSidebar = category.showSidebar !== false;
  const headerStyle = category.headerStyle || "hero";
  const cardStyle = category.cardStyle || "full";
  const showHeader = headerStyle !== "none";
  const offset = (currentPage - 1) * perPage;
  const { items: articles, total } = await getArticles(env.DB, {
    categorySlug: slug,
    isOnline: true,
    limit: perPage,
    offset,
    sortBy,
    sortOrder
  });
  const totalPages = Math.ceil(total / perPage);
  const featuredArticle = currentPage === 1 && headerStyle === "hero" ? articles[0] : null;
  const gridArticles = featuredArticle ? articles.slice(1) : articles;
  const baseUrl = `/categories/${slug}`;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": category.metaTitle || category.headline || category.label, "description": category.metaDescription || category.shortDescription, "data-astro-cid-dqg6fwsj": true }, { "default": async ($$result2) => renderTemplate`  ${renderComponent($$result2, "CategoryHeader", $$CategoryHeader, { "category": category, "featuredArticle": featuredArticle, "headerStyle": headerStyle, "data-astro-cid-dqg6fwsj": true })}  ${maybeRenderHead()}<section${addAttribute(["recipes-section", { "no-hero": !showHeader }], "class:list")} data-astro-cid-dqg6fwsj> <div class="container" data-astro-cid-dqg6fwsj> ${showBreadcrumb && renderTemplate`${renderComponent($$result2, "Breadcrumb", $$Breadcrumb, { "items": [
    { label: "Cat\xE9gories", href: "/categories" },
    { label: category.label }
  ], "data-astro-cid-dqg6fwsj": true })}`} <div class="section-header" data-astro-cid-dqg6fwsj> <h2 class="section-title" data-astro-cid-dqg6fwsj>${category.collectionTitle || `${category.label} Recipes`}</h2> <span class="recipe-count" data-astro-cid-dqg6fwsj>${total} recette${total > 1 ? "s" : ""}</span> </div> <div${addAttribute(["recipes-layout", { "with-sidebar": showSidebar }], "class:list")} data-astro-cid-dqg6fwsj> <div class="recipes-main" data-astro-cid-dqg6fwsj> ${gridArticles.length > 0 ? renderTemplate`${renderComponent($$result2, "ArticleGrid", $$ArticleGrid, { "articles": gridArticles, "layoutMode": layoutMode, "cardStyle": cardStyle, "data-astro-cid-dqg6fwsj": true })}` : articles.length === 0 ? renderTemplate`<div class="empty-state" data-astro-cid-dqg6fwsj> <p data-astro-cid-dqg6fwsj>No recipes found in this category yet.</p> </div>` : null} ${showPagination && totalPages > 1 && renderTemplate`${renderComponent($$result2, "Pagination", $$Pagination, { "currentPage": currentPage, "totalPages": totalPages, "baseUrl": baseUrl, "data-astro-cid-dqg6fwsj": true })}`} </div> ${showSidebar && renderTemplate`<aside class="recipes-sidebar" data-astro-cid-dqg6fwsj> ${renderComponent($$result2, "PopularRecipes", $$PopularRecipes, { "limit": 5, "data-astro-cid-dqg6fwsj": true })} ${renderComponent($$result2, "NewsletterWidget", $$NewsletterWidget, { "data-astro-cid-dqg6fwsj": true })} </aside>`} </div> </div> </section>  <section class="category-nav-section" data-astro-cid-dqg6fwsj> <div class="container" data-astro-cid-dqg6fwsj> <h2 class="nav-title" data-astro-cid-dqg6fwsj>Explore More Categories</h2> <div class="category-chips" data-astro-cid-dqg6fwsj> ${allCategories.filter((cat) => cat.slug !== slug).slice(0, 6).map((cat) => renderTemplate`<a${addAttribute(`/categories/${cat.slug}`, "href")} class="category-chip" data-astro-cid-dqg6fwsj> <div class="chip-svg" data-astro-cid-dqg6fwsj> ${cat.iconSvg ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate`${unescapeHTML(cat.iconSvg)}` })}` : renderTemplate`<div class="chip-placeholder"${addAttribute(`background-color: ${cat.color || "#ff3366"}`, "style")} data-astro-cid-dqg6fwsj> <span data-astro-cid-dqg6fwsj>${cat.label.charAt(0)}</span> </div>`} </div> <span class="chip-label" data-astro-cid-dqg6fwsj>${cat.label}</span> </a>`)} </div> </div> </section>  <section class="newsletter-section" id="newsletter" data-astro-cid-dqg6fwsj> <div class="newsletter-bar" data-astro-cid-dqg6fwsj> <div class="newsletter-content" data-astro-cid-dqg6fwsj> <div class="newsletter-icon" data-astro-cid-dqg6fwsj> <svg width="48" height="48" viewBox="0 0 24 24" fill="none" data-astro-cid-dqg6fwsj> <circle cx="12" cy="12" r="10" fill="#ff6b35" data-astro-cid-dqg6fwsj></circle> <path d="M8 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-dqg6fwsj></path> </svg> </div> <div class="newsletter-text" data-astro-cid-dqg6fwsj> <h3 data-astro-cid-dqg6fwsj>Keep Current at All Times</h3> <p data-astro-cid-dqg6fwsj>Subscribe Now for Immediate Updates on My Latest Recipes!</p> </div> </div> <form class="newsletter-form" data-astro-cid-dqg6fwsj> <input type="email" placeholder="Your email address" required data-astro-cid-dqg6fwsj> <label class="terms-checkbox" data-astro-cid-dqg6fwsj> <input type="checkbox" required data-astro-cid-dqg6fwsj> <span data-astro-cid-dqg6fwsj>I have read and agree to the terms & conditions</span> </label> <button type="submit" data-astro-cid-dqg6fwsj>Sign Up Now</button> </form> </div> </section> ` })} `;
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
