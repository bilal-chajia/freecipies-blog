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

export { b as authors } from './pinterest.schema_eG5oHE2g.mjs';
export { c as createAuthor, d as deleteAuthor, b as getAuthorById, g as getAuthorBySlug, a as getAuthors, u as updateAuthor, e as updateAuthorById } from './authors.service_DDYOeshw.mjs';

const getBestVariant = (variants) => {
  return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};
const normalizeSocialLinks = (value) => {
  if (!value) return void 0;
  if (Array.isArray(value)) {
    return value.filter((entry) => entry && typeof entry === "object").map((entry) => ({
      network: entry.network,
      url: entry.url,
      label: entry.label
    })).filter((entry) => entry.network && entry.url);
  }
  if (typeof value === "object") {
    return Object.entries(value).filter(([, url]) => typeof url === "string" && url.trim().length > 0).map(([network, url]) => ({ network, url: String(url).trim() }));
  }
  return void 0;
};
const normalizeBioJsonObject = (value) => {
  if (!value || typeof value !== "object") return {};
  const short = value.short ?? value.introduction ?? value.headline ?? void 0;
  const long = value.long ?? value.fullBio ?? value.subtitle ?? void 0;
  const introduction = value.introduction ?? (typeof value.short === "string" ? value.short : void 0);
  const fullBio = value.fullBio ?? (typeof value.long === "string" ? value.long : void 0);
  const socials = normalizeSocialLinks(value.socials ?? value.socialLinks);
  const legacySocialLinks = value.socialLinks && typeof value.socialLinks === "object" && !Array.isArray(value.socialLinks) ? Object.fromEntries(
    Object.entries(value.socialLinks).filter(([, url]) => typeof url === "string" && url.trim().length > 0)
  ) : void 0;
  const socialLinksFromArray = !legacySocialLinks && socials ? Object.fromEntries(socials.map((entry) => [entry.network, entry.url])) : void 0;
  const normalized = {};
  if (value.headline) normalized.headline = value.headline;
  if (value.subtitle) normalized.subtitle = value.subtitle;
  if (introduction) normalized.introduction = introduction;
  if (fullBio) normalized.fullBio = fullBio;
  if (Array.isArray(value.expertise)) normalized.expertise = value.expertise;
  if (legacySocialLinks && Object.keys(legacySocialLinks).length > 0) {
    normalized.socialLinks = legacySocialLinks;
  } else if (socialLinksFromArray && Object.keys(socialLinksFromArray).length > 0) {
    normalized.socialLinks = socialLinksFromArray;
  }
  if (short) normalized.short = short;
  if (long) normalized.long = long;
  if (socials && socials.length > 0) normalized.socials = socials;
  return normalized;
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
function parseImagesJson(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      const images = typeof parsed === "object" && parsed ? parsed : {};
      const normalized = {
        avatar: normalizeImageSlot(images.avatar),
        cover: normalizeImageSlot(images.cover),
        banner: normalizeImageSlot(images.banner)
      };
      return JSON.stringify(normalized);
    } catch {
      return "{}";
    }
  }
  if (typeof value === "object") {
    const normalized = {
      avatar: normalizeImageSlot(value.avatar),
      cover: normalizeImageSlot(value.cover),
      banner: normalizeImageSlot(value.banner)
    };
    return JSON.stringify(normalized);
  }
  return "{}";
}
function parseBioJson(value) {
  if (!value) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeBioJsonObject(parsed));
    } catch {
      return "{}";
    }
  }
  if (typeof value === "object") {
    return JSON.stringify(normalizeBioJsonObject(value));
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
function transformAuthorRequestBody(body) {
  const transformed = { ...body };
  const hasLegacyImageFields = ["imageUrl", "imageAlt", "imageWidth", "imageHeight"].some((key) => Object.prototype.hasOwnProperty.call(body, key));
  if (body.imagesJson !== void 0) {
    transformed.imagesJson = parseImagesJson(body.imagesJson);
  } else if (hasLegacyImageFields) {
    const images = {};
    if (body.imageUrl) {
      images.avatar = {
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
  if (body.bioJson !== void 0) {
    transformed.bioJson = parseBioJson(body.bioJson);
  } else if (body.introduction || body.fullBio || body.socialLinks || body.headline || body.subtitle) {
    transformed.bioJson = parseBioJson({
      introduction: body.introduction,
      fullBio: body.fullBio,
      socialLinks: body.socialLinks,
      headline: body.headline,
      subtitle: body.subtitle
    });
  }
  if (body.seoJson !== void 0) {
    transformed.seoJson = parseSeoJson(body.seoJson);
  } else if (body.metaTitle || body.metaDescription || body.canonicalUrl || body.canonical) {
    transformed.seoJson = parseSeoJson({
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      canonical: body.canonical,
      canonicalUrl: body.canonicalUrl
    });
  }
  return transformed;
}
function transformAuthorResponse(author) {
  if (!author) return author;
  const response = { ...author };
  if (author.imagesJson) {
    try {
      const images = JSON.parse(author.imagesJson);
      if (images.avatar) {
        const variant = getBestVariant(images.avatar.variants);
        response.imageUrl = variant?.url;
        response.imageAlt = images.avatar.alt;
        response.imageWidth = variant?.width;
        response.imageHeight = variant?.height;
      }
    } catch {
    }
  }
  if (author.seoJson) {
    try {
      const seo = JSON.parse(author.seoJson);
      if (!response.metaTitle) response.metaTitle = seo.metaTitle;
      if (!response.metaDescription) response.metaDescription = seo.metaDescription;
      if (!response.canonicalUrl && seo.canonical) response.canonicalUrl = seo.canonical;
    } catch {
    }
  }
  return response;
}

export { parseBioJson, parseImagesJson, parseSeoJson, transformAuthorRequestBody, transformAuthorResponse };
