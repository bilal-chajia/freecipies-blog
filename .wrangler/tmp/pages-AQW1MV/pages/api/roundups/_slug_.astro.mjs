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

import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { b as getArticleBySlug } from '../../../chunks/articles.service_DgNeye45.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
function generateItemListJsonLd(article, baseUrl) {
  const roundupData = typeof article.roundupJson === "string" ? JSON.parse(article.roundupJson || '{"items":[],"listType":"ItemList"}') : article.roundupJson || { items: []};
  const imagesData = typeof article.imagesJson === "string" ? JSON.parse(article.imagesJson || "{}") : article.imagesJson || {};
  const mainImage = imagesData.cover?.variants?.lg?.url || imagesData.cover?.variants?.md?.url;
  const itemListElement = (roundupData.items || []).map((item) => {
    const itemImage = item.cover?.variants?.lg?.url || item.cover?.variants?.md?.url;
    let itemUrl;
    if (item.article_id) {
      itemUrl = `${baseUrl}/recipes/${item.article_id}`;
    } else if (item.external_url) {
      itemUrl = item.external_url;
    }
    return {
      "@type": "ListItem",
      position: item.position,
      name: item.title,
      description: item.subtitle,
      url: itemUrl,
      image: itemImage
    };
  });
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: article.headline,
    description: article.shortDescription,
    image: mainImage,
    numberOfItems: roundupData.items?.length || 0,
    itemListElement,
    author: {
      "@type": "Person",
      name: article.authorName || article.cachedAuthorJson?.name
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt
  };
}
const GET = async ({ params, locals, url }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const article = await getArticleBySlug(db, slug, "roundup");
    if (!article) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Roundup not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const baseUrl = `${url.protocol}//${url.host}`;
    const jsonLd = generateItemListJsonLd(article, baseUrl);
    const responseData = {
      ...article,
      jsonLd
    };
    const { body, status, headers } = formatSuccessResponse(responseData, {
      cacheControl: "public, max-age=3600"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching roundup:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch roundup",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
