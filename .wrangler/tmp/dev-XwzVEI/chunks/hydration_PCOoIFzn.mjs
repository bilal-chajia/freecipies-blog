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

function safeParseJson(json) {
  if (!json) return null;
  try {
    return typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return null;
  }
}
function getImageSlot(imagesJson, slot = "thumbnail") {
  const images = safeParseJson(imagesJson);
  if (!images) return null;
  return images[slot] || null;
}
const LOCAL_IMAGE_HOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;
const normalizeImageUrl = (url) => {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed || !LOCAL_IMAGE_HOST_RE.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed.replace(LOCAL_IMAGE_HOST_RE, "");
  }
};
const buildSrcSet = (variants) => {
  if (!variants) return "";
  const entries = [];
  const ordered = ["xs", "sm", "md", "lg", "original"];
  for (const key of ordered) {
    const variant = variants[key];
    const normalizedUrl = normalizeImageUrl(variant?.url);
    if (normalizedUrl && variant?.width) {
      entries.push(`${normalizedUrl} ${variant.width}w`);
    }
  }
  return entries.join(", ");
};
function getImageSrcSet(imagesJson, slot = "thumbnail") {
  const imageSlot = getImageSlot(imagesJson, slot);
  if (!imageSlot?.variants) return "";
  return buildSrcSet(imageSlot.variants);
}
const FALLBACK_VARIANT_ORDER = ["lg", "md", "sm", "original", "xs"];
const FALLBACK_VARIANT_ORDER_FOR_TARGET = ["xs", "sm", "md", "lg", "original"];
const pickVariantByWidth = (variants, targetWidth) => {
  if (!variants) return null;
  const entries = Object.entries(variants).filter(([, variant]) => variant && typeof variant.url === "string").map(([key, variant]) => ({ key, ...variant }));
  if (!entries.length) return null;
  const withWidth = entries.filter((variant) => typeof variant.width === "number" && (variant.width || 0) > 0).sort((a, b) => (a.width || 0) - (b.width || 0));
  if (targetWidth && withWidth.length > 0) {
    const match = withWidth.find((variant) => (variant.width || 0) >= targetWidth);
    return match || withWidth[withWidth.length - 1] || null;
  }
  const fallbackOrder = targetWidth ? FALLBACK_VARIANT_ORDER_FOR_TARGET : FALLBACK_VARIANT_ORDER;
  for (const key of fallbackOrder) {
    const candidate = variants[key];
    if (candidate?.url) return candidate;
  }
  return entries[0] || null;
};
function extractImage(imagesJson, slot = "thumbnail", targetWidth) {
  const images = safeParseJson(imagesJson);
  if (!images) return {};
  const imageSlot = images[slot];
  if (!imageSlot) return {};
  const variant = pickVariantByWidth(imageSlot.variants, targetWidth);
  const normalizedVariantUrl = normalizeImageUrl(variant?.url);
  if (normalizedVariantUrl) {
    return {
      imageUrl: normalizedVariantUrl,
      imageAlt: imageSlot.alt,
      imageWidth: variant.width,
      imageHeight: variant.height
    };
  }
  const normalizedSlotUrl = normalizeImageUrl(imageSlot.url);
  if (normalizedSlotUrl) {
    return {
      imageUrl: normalizedSlotUrl,
      imageAlt: imageSlot.alt,
      imageWidth: imageSlot.width,
      imageHeight: imageSlot.height
    };
  }
  return {};
}
function extractSeo(seoJson) {
  const seo = safeParseJson(seoJson);
  if (!seo) return {};
  return {
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    ogImage: seo.ogImage,
    canonical: seo.canonical ?? void 0
  };
}
function extractTagStyle(styleJson) {
  const style = safeParseJson(styleJson);
  if (!style) return {};
  return {
    color: style.color,
    icon: style.svg_code,
    svgCode: style.svg_code,
    variant: style.variant
  };
}
function hydrateArticle(article) {
  const image = extractImage(article.imagesJson);
  let authorAvatar = extractImage(article.authorImagesJson, "avatar").imageUrl;
  if (!authorAvatar && article.cachedAuthorJson) {
    const cachedAuthor = safeParseJson(article.cachedAuthorJson);
    authorAvatar = cachedAuthor?.avatar;
  }
  if (!authorAvatar && article.author?.imagesJson) {
    authorAvatar = extractImage(article.author.imagesJson, "avatar").imageUrl;
  }
  authorAvatar = normalizeImageUrl(authorAvatar);
  const seo = extractSeo(article.seoJson);
  const route = article.type === "recipe" ? `/recipes/${article.slug}` : `/articles/${article.slug}`;
  return {
    ...article,
    ...image,
    ...seo,
    contentJson: safeParseJson(article.contentJson),
    recipeJson: safeParseJson(article.recipeJson),
    roundupJson: safeParseJson(article.roundupJson),
    faqsJson: safeParseJson(article.faqsJson),
    label: article.headline,
    // Alias for UI consistency
    route,
    authorAvatar
  };
}
function hydrateCategory(category) {
  const image = extractImage(category.imagesJson);
  const seo = extractSeo(category.seoJson);
  const config = safeParseJson(category.configJson);
  const numEntriesPerPage = config?.postsPerPage;
  const tldr = config?.tldr;
  const layoutMode = config?.layout;
  const cardStyle = config?.cardStyle;
  const showInNav = config?.showInNav;
  const showInFooter = config?.showInFooter;
  const showSidebar = config?.showSidebar;
  const showFilters = config?.showFilters;
  const showBreadcrumb = config?.showBreadcrumb;
  const showPagination = config?.showPagination;
  const sortBy = config?.sortBy;
  const sortOrder = config?.sortOrder;
  const headerStyle = config?.headerStyle;
  const rawIconSvg = category.iconSvg ?? category.icon_svg ?? config?.iconSvg ?? config?.icon_svg;
  const iconSvg = typeof rawIconSvg === "string" && rawIconSvg.trim() ? rawIconSvg.trim() : void 0;
  return {
    ...category,
    ...image,
    ...seo,
    imagesJson: safeParseJson(category.imagesJson),
    seoJson: safeParseJson(category.seoJson),
    route: `/categories/${category.slug}`,
    ...iconSvg ? { iconSvg } : {},
    ...typeof numEntriesPerPage === "number" ? { numEntriesPerPage } : {},
    ...typeof tldr === "string" ? { tldr } : {},
    ...layoutMode ? { layoutMode } : {},
    ...cardStyle ? { cardStyle } : {},
    ...typeof showInNav === "boolean" ? { showInNav } : {},
    ...typeof showInFooter === "boolean" ? { showInFooter } : {},
    ...typeof showSidebar === "boolean" ? { showSidebar } : {},
    ...typeof showFilters === "boolean" ? { showFilters } : {},
    ...typeof showBreadcrumb === "boolean" ? { showBreadcrumb } : {},
    ...typeof showPagination === "boolean" ? { showPagination } : {},
    ...sortBy ? { sortBy } : {},
    ...sortOrder ? { sortOrder } : {},
    ...headerStyle ? { headerStyle } : {}
  };
}
function hydrateAuthor(author) {
  const image = extractImage(author.imagesJson, "avatar");
  const seo = extractSeo(author.seoJson);
  return {
    ...author,
    ...image,
    ...seo,
    imagesJson: safeParseJson(author.imagesJson),
    seoJson: safeParseJson(author.seoJson),
    job: author.jobTitle,
    // Alias for template compatibility
    route: `/authors/${author.slug}`
  };
}
function hydrateTag(tag) {
  const style = extractTagStyle(tag.styleJson);
  return {
    ...tag,
    ...style,
    styleJson: safeParseJson(tag.styleJson),
    route: `/tags/${tag.slug}`
  };
}
function hydrateArticles(articles) {
  return articles.map(hydrateArticle);
}
function hydrateCategories(categories) {
  return categories.map(hydrateCategory);
}
function hydrateTags(tags) {
  return tags.map(hydrateTag);
}

export { hydrateArticle as a, hydrateCategories as b, hydrateTags as c, hydrateAuthor as d, extractImage as e, hydrateCategory as f, getImageSrcSet as g, hydrateArticles as h, hydrateTag as i, safeParseJson as s };
