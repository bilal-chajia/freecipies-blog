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

import '../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { c as getArticles } from '../../chunks/articles.service_DgNeye45.mjs';
import { A as AppError, E as ErrorCodes, a as formatSuccessResponse, f as formatErrorResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const author = url.searchParams.get("author");
  const search = url.searchParams.get("search");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "12")));
  const offset = (page - 1) * limit;
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const options = {
      type: "roundup",
      isOnline: true,
      limit,
      offset
    };
    if (category) options.categorySlug = category;
    if (author) options.authorSlug = author;
    if (search?.trim()) options.search = search.trim();
    const result = await getArticles(db, options);
    const items = result.items.map((article) => {
      let itemCount = 0;
      if (article.roundupJson) {
        try {
          const roundupData = typeof article.roundupJson === "string" ? JSON.parse(article.roundupJson) : article.roundupJson;
          itemCount = roundupData.items?.length || 0;
        } catch {
          itemCount = 0;
        }
      }
      let thumbnail = null;
      if (article.imagesJson) {
        try {
          const images = typeof article.imagesJson === "string" ? JSON.parse(article.imagesJson) : article.imagesJson;
          thumbnail = images.thumbnail || images.cover;
        } catch {
          thumbnail = null;
        }
      }
      return {
        id: article.id,
        slug: article.slug,
        headline: article.headline,
        shortDescription: article.shortDescription,
        thumbnail,
        categoryLabel: article.categoryLabel,
        categorySlug: article.categorySlug,
        categoryColor: article.categoryColor,
        authorName: article.authorName,
        authorSlug: article.authorSlug,
        publishedAt: article.publishedAt,
        // Roundup-specific
        itemCount
      };
    });
    const { body, status, headers } = formatSuccessResponse({
      items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: page * limit < result.total
      }
    }, {
      cacheControl: "public, max-age=300"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching roundups:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch roundups",
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
