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
import { b as getArticleBySlug, c as getArticles } from '../../chunks/articles.service_DgNeye45.mjs';
export { renderers } from '../../renderers.mjs';

const CACHE_STRATEGIES = {
  // Static assets - cache forever
  STATIC: {
    maxAge: 31536e3,
    // 1 year
    public: true
  },
  // API responses - moderate caching
  API_DEFAULT: {
    maxAge: 3600,
    // 1 hour
    sMaxAge: 3600,
    staleWhileRevalidate: 86400,
    // 1 day
    public: true
  },
  // Frequently accessed data
  API_FREQUENT: {
    maxAge: 300,
    // 5 minutes
    sMaxAge: 300,
    staleWhileRevalidate: 3600,
    // 1 hour
    public: true
  },
  // User-specific data
  API_PRIVATE: {
    maxAge: 60,
    // 1 minute
    private: true,
    staleWhileRevalidate: 300
    // 5 minutes
  },
  // No cache
  NO_CACHE: {
    maxAge: 0,
    private: true
  }
};
function generateCacheControl(config) {
  const directives = [];
  if (config.public) directives.push("public");
  if (config.private) directives.push("private");
  directives.push(`max-age=${config.maxAge}`);
  if (config.sMaxAge !== void 0) {
    directives.push(`s-maxage=${config.sMaxAge}`);
  }
  if (config.staleWhileRevalidate !== void 0) {
    directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }
  if (config.staleIfError !== void 0) {
    directives.push(`stale-if-error=${config.staleIfError}`);
  }
  return directives.join(", ");
}
function getCacheHeaders(strategy) {
  return {
    "Cache-Control": generateCacheControl(strategy)
  };
}

const prerender = false;
const GET = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const category = url.searchParams.get("category");
  const author = url.searchParams.get("author");
  const limit = parseInt(url.searchParams.get("limit") || "12");
  const page = parseInt(url.searchParams.get("page") || "1");
  const offset = (page - 1) * limit;
  try {
    const env = locals.runtime.env;
    const db = env.DB;
    if (slug) {
      const recipe = await getArticleBySlug(db, slug, "recipe");
      if (!recipe) {
        return new Response(JSON.stringify({
          success: false,
          error: "Recipe not found"
        }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: recipe
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...getCacheHeaders(CACHE_STRATEGIES.API_DEFAULT)
          }
        }
      );
    }
    const recipes = await getArticles(db, {
      type: "recipe",
      categorySlug: category || void 0,
      authorSlug: author || void 0,
      limit,
      offset
    });
    return new Response(
      JSON.stringify({
        success: true,
        data: recipes.items,
        pagination: {
          page,
          limit,
          total: recipes.total,
          totalPages: Math.ceil(recipes.total / limit)
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCacheHeaders(CACHE_STRATEGIES.API_DEFAULT)
        }
      }
    );
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to fetch recipes",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
