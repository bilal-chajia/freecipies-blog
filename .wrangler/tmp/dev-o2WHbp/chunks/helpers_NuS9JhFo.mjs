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

import { s as safeParseJson } from './hydration_PCOoIFzn.mjs';

function transformArticleRequestBody(body) {
  const transformed = { ...body };
  const jsonFields = [
    "imagesJson",
    "contentJson",
    "recipeJson",
    "roundupJson",
    "faqsJson",
    "seoJson",
    "configJson",
    "jsonldJson",
    "relatedArticlesJson",
    "cachedTagsJson",
    "cachedCategoryJson",
    "cachedAuthorJson",
    "cachedEquipmentJson",
    "cachedRecipeJson",
    "cachedCardJson"
  ];
  for (const field of jsonFields) {
    if (body[field] !== void 0) {
      transformed[field] = safeParseJson(body[field]);
    }
  }
  if (!body.imagesJson) {
    const images = {};
    if (body.imageUrl) {
      images.thumbnail = {
        url: body.imageUrl,
        alt: body.imageAlt || "",
        width: body.imageWidth,
        height: body.imageHeight
      };
    }
    if (body.coverUrl) {
      images.cover = {
        url: body.coverUrl,
        alt: body.coverAlt || "",
        width: body.coverWidth,
        height: body.coverHeight
      };
    }
    if (Object.keys(images).length > 0) {
      transformed.imagesJson = images;
    }
  }
  delete transformed.imageUrl;
  delete transformed.imageAlt;
  delete transformed.imageWidth;
  delete transformed.imageHeight;
  delete transformed.coverUrl;
  delete transformed.coverAlt;
  delete transformed.coverWidth;
  delete transformed.coverHeight;
  return transformed;
}

export { transformArticleRequestBody as t };
