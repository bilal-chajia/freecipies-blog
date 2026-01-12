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

const getBestVariant = (variants) => {
  return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};
const normalizeImageSlot = (slot) => {
  if (!slot || typeof slot !== "object") return slot;
  if (slot.variants && typeof slot.variants === "object") {
    return slot;
  }
  if (slot.url) {
    return {
      ...slot,
      variants: {
        original: {
          url: slot.url,
          width: slot.width ?? 0,
          height: slot.height ?? 0
        }
      }
    };
  }
  return slot;
};
const normalizeSeoJsonObject = (value) => {
  if (!value || typeof value !== "object") return {};
  return {
    metaTitle: value.metaTitle,
    metaDescription: value.metaDescription,
    noIndex: value.noIndex,
    canonical: value.canonical ?? value.canonicalUrl,
    ogImage: value.ogImage,
    ogTitle: value.ogTitle,
    ogDescription: value.ogDescription,
    twitterCard: value.twitterCard,
    robots: value.robots
  };
};
const normalizeConfigJsonObject = (value) => {
  if (!value || typeof value !== "object") return {};
  const postsPerPage = value.postsPerPage ?? value.numEntriesPerPage ?? value.entriesPerPage;
  const layout = value.layout ?? value.layoutMode;
  const normalized = {};
  if (typeof postsPerPage === "number") normalized.postsPerPage = postsPerPage;
  if (typeof value.tldr === "string") normalized.tldr = value.tldr;
  if (typeof value.showInNav === "boolean") normalized.showInNav = value.showInNav;
  if (typeof value.showInFooter === "boolean") normalized.showInFooter = value.showInFooter;
  if (typeof layout === "string") normalized.layout = layout;
  if (typeof value.cardStyle === "string") normalized.cardStyle = value.cardStyle;
  if (typeof value.showSidebar === "boolean") normalized.showSidebar = value.showSidebar;
  if (typeof value.showFilters === "boolean") normalized.showFilters = value.showFilters;
  if (typeof value.showBreadcrumb === "boolean") normalized.showBreadcrumb = value.showBreadcrumb;
  if (typeof value.showPagination === "boolean") normalized.showPagination = value.showPagination;
  if (typeof value.sortBy === "string") normalized.sortBy = value.sortBy;
  if (typeof value.sortOrder === "string") normalized.sortOrder = value.sortOrder;
  if (typeof value.headerStyle === "string") normalized.headerStyle = value.headerStyle;
  return normalized;
};
const parseConfigJsonValue = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value;
  return {};
};
function parseImagesJson(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      const images = typeof parsed === "object" && parsed ? parsed : {};
      const normalized = {
        thumbnail: normalizeImageSlot(images.thumbnail),
        cover: normalizeImageSlot(images.cover)
      };
      return JSON.stringify(normalized);
    } catch {
      return "{}";
    }
  }
  if (typeof value === "object") {
    const normalized = {
      thumbnail: normalizeImageSlot(value.thumbnail),
      cover: normalizeImageSlot(value.cover)
    };
    return JSON.stringify(normalized);
  }
  return "{}";
}
function parseSeoJson(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeSeoJsonObject(parsed));
    } catch {
      return "{}";
    }
  }
  if (typeof value === "object") {
    return JSON.stringify(normalizeSeoJsonObject(value));
  }
  return "{}";
}
function parseConfigJson(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeConfigJsonObject(parsed));
    } catch {
      return "{}";
    }
  }
  if (typeof value === "object") {
    return JSON.stringify(normalizeConfigJsonObject(value));
  }
  return "{}";
}
function transformCategoryRequestBody(body) {
  const transformed = { ...body };
  const hasLegacyImageFields = ["imageUrl", "imageAlt", "imageWidth", "imageHeight"].some((key) => Object.prototype.hasOwnProperty.call(body, key));
  const configOverrides = {};
  if (body.numEntriesPerPage !== void 0) {
    configOverrides.postsPerPage = body.numEntriesPerPage;
    delete transformed.numEntriesPerPage;
  }
  if (body.postsPerPage !== void 0) {
    configOverrides.postsPerPage = body.postsPerPage;
    delete transformed.postsPerPage;
  }
  if (body.tldr !== void 0) {
    configOverrides.tldr = body.tldr;
    delete transformed.tldr;
  }
  if (body.showInNav !== void 0) {
    configOverrides.showInNav = body.showInNav;
    delete transformed.showInNav;
  }
  if (body.showInFooter !== void 0) {
    configOverrides.showInFooter = body.showInFooter;
    delete transformed.showInFooter;
  }
  if (body.layout !== void 0) {
    configOverrides.layout = body.layout;
    delete transformed.layout;
  }
  if (body.layoutMode !== void 0) {
    configOverrides.layout = body.layoutMode;
    delete transformed.layoutMode;
  }
  if (body.cardStyle !== void 0) {
    configOverrides.cardStyle = body.cardStyle;
    delete transformed.cardStyle;
  }
  if (body.showSidebar !== void 0) {
    configOverrides.showSidebar = body.showSidebar;
    delete transformed.showSidebar;
  }
  if (body.showFilters !== void 0) {
    configOverrides.showFilters = body.showFilters;
    delete transformed.showFilters;
  }
  if (body.showBreadcrumb !== void 0) {
    configOverrides.showBreadcrumb = body.showBreadcrumb;
    delete transformed.showBreadcrumb;
  }
  if (body.showPagination !== void 0) {
    configOverrides.showPagination = body.showPagination;
    delete transformed.showPagination;
  }
  if (body.sortBy !== void 0) {
    configOverrides.sortBy = body.sortBy;
    delete transformed.sortBy;
  }
  if (body.sortOrder !== void 0) {
    configOverrides.sortOrder = body.sortOrder;
    delete transformed.sortOrder;
  }
  if (body.headerStyle !== void 0) {
    configOverrides.headerStyle = body.headerStyle;
    delete transformed.headerStyle;
  }
  if (body.imagesJson !== void 0) {
    transformed.imagesJson = parseImagesJson(body.imagesJson);
  } else if (hasLegacyImageFields) {
    const images = {};
    if (body.imageUrl) {
      images.thumbnail = {
        alt: body.imageAlt,
        variants: {
          original: {
            url: body.imageUrl,
            width: body.imageWidth ?? 0,
            height: body.imageHeight ?? 0
          }
        }
      };
    }
    transformed.imagesJson = JSON.stringify(images);
    delete transformed.imageUrl;
    delete transformed.imageAlt;
    delete transformed.imageWidth;
    delete transformed.imageHeight;
  }
  if (body.seoJson !== void 0) {
    transformed.seoJson = parseSeoJson(body.seoJson);
  } else if (body.metaTitle || body.metaDescription || body.canonicalUrl || body.canonical || body.ogImage || body.ogTitle || body.ogDescription || body.twitterCard || body.robots || body.noIndex) {
    transformed.seoJson = parseSeoJson({
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      canonical: body.canonical,
      canonicalUrl: body.canonicalUrl,
      ogImage: body.ogImage,
      ogTitle: body.ogTitle,
      ogDescription: body.ogDescription,
      twitterCard: body.twitterCard,
      robots: body.robots,
      noIndex: body.noIndex
    });
  }
  if (body.configJson !== void 0 || Object.keys(configOverrides).length > 0) {
    const baseConfig = parseConfigJsonValue(body.configJson);
    transformed.configJson = parseConfigJson({ ...baseConfig, ...configOverrides });
  }
  const missing = [];
  if (!transformed.slug) missing.push("slug");
  if (!transformed.label) missing.push("label");
  if (!transformed.shortDescription) missing.push("shortDescription");
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  return transformed;
}
function transformCategoryResponse(category) {
  if (!category) return category;
  const response = { ...category };
  if (!response.iconSvg && category.icon_svg) {
    response.iconSvg = category.icon_svg;
  }
  if (category.imagesJson) {
    try {
      const images = JSON.parse(category.imagesJson);
      const primarySlot = images.thumbnail ?? images.cover;
      const variant = getBestVariant(primarySlot?.variants);
      response.imageUrl = variant?.url;
      response.imageAlt = primarySlot?.alt;
      response.imageWidth = variant?.width;
      response.imageHeight = variant?.height;
    } catch {
    }
  }
  if (category.seoJson) {
    try {
      const seo = JSON.parse(category.seoJson);
      if (!response.metaTitle) response.metaTitle = seo.metaTitle;
      if (!response.metaDescription) response.metaDescription = seo.metaDescription;
      if (!response.canonicalUrl && seo.canonical) response.canonicalUrl = seo.canonical;
      if (response.ogImage === void 0 && seo.ogImage !== void 0) response.ogImage = seo.ogImage;
      if (response.ogTitle === void 0 && seo.ogTitle !== void 0) response.ogTitle = seo.ogTitle;
      if (response.ogDescription === void 0 && seo.ogDescription !== void 0) response.ogDescription = seo.ogDescription;
      if (response.twitterCard === void 0 && seo.twitterCard !== void 0) response.twitterCard = seo.twitterCard;
      if (response.robots === void 0 && seo.robots !== void 0) response.robots = seo.robots;
      if (response.noIndex === void 0 && seo.noIndex !== void 0) response.noIndex = seo.noIndex;
    } catch {
    }
  }
  if (category.configJson) {
    try {
      const config = JSON.parse(category.configJson);
      const configIconSvg = config?.iconSvg ?? config?.icon_svg;
      if (!response.iconSvg && typeof configIconSvg === "string") {
        response.iconSvg = configIconSvg;
      }
      if (response.numEntriesPerPage === void 0 && typeof config.postsPerPage === "number") {
        response.numEntriesPerPage = config.postsPerPage;
      }
      if (response.tldr === void 0 && typeof config.tldr === "string") {
        response.tldr = config.tldr;
      }
      if (response.showInNav === void 0 && typeof config.showInNav === "boolean") {
        response.showInNav = config.showInNav;
      }
      if (response.showInFooter === void 0 && typeof config.showInFooter === "boolean") {
        response.showInFooter = config.showInFooter;
      }
      if (response.layoutMode === void 0 && typeof config.layout === "string") {
        response.layoutMode = config.layout;
      }
      if (response.cardStyle === void 0 && typeof config.cardStyle === "string") {
        response.cardStyle = config.cardStyle;
      }
      if (response.showSidebar === void 0 && typeof config.showSidebar === "boolean") {
        response.showSidebar = config.showSidebar;
      }
      if (response.showFilters === void 0 && typeof config.showFilters === "boolean") {
        response.showFilters = config.showFilters;
      }
      if (response.showBreadcrumb === void 0 && typeof config.showBreadcrumb === "boolean") {
        response.showBreadcrumb = config.showBreadcrumb;
      }
      if (response.showPagination === void 0 && typeof config.showPagination === "boolean") {
        response.showPagination = config.showPagination;
      }
      if (response.sortBy === void 0 && typeof config.sortBy === "string") {
        response.sortBy = config.sortBy;
      }
      if (response.sortOrder === void 0 && typeof config.sortOrder === "string") {
        response.sortOrder = config.sortOrder;
      }
      if (response.headerStyle === void 0 && typeof config.headerStyle === "string") {
        response.headerStyle = config.headerStyle;
      }
    } catch {
    }
  }
  return response;
}

export { transformCategoryRequestBody as a, transformCategoryResponse as t };
