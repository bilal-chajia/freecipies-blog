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
import { b as getArticleBySlug, c as getArticles, e as createArticle, s as syncCachedFields } from '../../chunks/articles.service_DgNeye45.mjs';
import { v as validatePaginationParams, A as AppError, E as ErrorCodes, f as formatErrorResponse, a as formatSuccessResponse } from '../../chunks/error-handler_D5quUcAZ.mjs';
import { e as extractAuthContext, h as hasRole, A as AuthRoles, c as createAuthError } from '../../chunks/auth.service_GsDnjv--.mjs';
import { t as transformArticleRequestBody } from '../../chunks/helpers_NuS9JhFo.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const GET = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const category = url.searchParams.get("category");
  const author = url.searchParams.get("author");
  const tag = url.searchParams.get("tag");
  const type = url.searchParams.get("type");
  const statusFilter = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const paginationValidation = validatePaginationParams(
    url.searchParams.get("limit"),
    url.searchParams.get("page")
  );
  const { limit, page, offset } = paginationValidation;
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    if (slug) {
      const article = await getArticleBySlug(db, slug, type || void 0);
      if (!article) {
        const { body: body3, status: status3, headers: headers3 } = formatErrorResponse(
          new AppError(ErrorCodes.NOT_FOUND, "Article not found", 404)
        );
        return new Response(body3, { status: status3, headers: headers3 });
      }
      const { body: body2, status: status2, headers: headers2 } = formatSuccessResponse(article, {
        cacheControl: "public, max-age=3600"
      });
      return new Response(body2, { status: status2, headers: headers2 });
    }
    let isOnlineFilter;
    if (statusFilter === "online") {
      isOnlineFilter = true;
    } else if (statusFilter === "offline") {
      isOnlineFilter = false;
    } else {
      isOnlineFilter = void 0;
    }
    const articles = await getArticles(db, {
      type: type || void 0,
      categorySlug: category || void 0,
      authorSlug: author || void 0,
      tagSlug: tag || void 0,
      isOnline: isOnlineFilter,
      search: search || void 0,
      limit,
      offset
    });
    const { body, status, headers } = formatSuccessResponse(articles.items, {
      pagination: {
        page,
        limit,
        total: articles.total,
        totalPages: Math.ceil(articles.total / limit)
      },
      cacheControl: "public, max-age=3600"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching articles:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch articles",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};
const POST = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const jwtSecret = env.JWT_SECRET || "Bildev2025";
    const authContext = await extractAuthContext(request, jwtSecret);
    if (!hasRole(authContext, AuthRoles.EDITOR)) {
      return createAuthError("Insufficient permissions", 403);
    }
    const reqBody = await request.json();
    const transformedData = transformArticleRequestBody(reqBody);
    const article = await createArticle(env.DB, transformedData);
    if (article?.id) {
      await syncCachedFields(env.DB, article.id);
    }
    const { body, status, headers } = formatSuccessResponse(article);
    return new Response(body, { status: 201, headers });
  } catch (error) {
    console.error("Error creating article:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(ErrorCodes.DATABASE_ERROR, "Failed to create article", 500)
    );
    return new Response(body, { status, headers });
  }
};
const PUT = async ({ request, locals }) => {
  try {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Method not allowed - use /api/articles/:slug for updates", 405)
    );
    return new Response(body, { status, headers });
  } catch (error) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.INTERNAL_ERROR, "Internal Error", 500)
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  PUT,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
