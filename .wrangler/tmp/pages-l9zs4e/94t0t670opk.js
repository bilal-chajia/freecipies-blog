// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: [
    "/*"
  ],
  exclude: [
    "/_astro/*",
    "/favicon.svg",
    "/robots.txt",
    "/logos/android-chrome-192x192.png",
    "/logos/android-chrome-512x512.png",
    "/logos/apple-touch-icon.png",
    "/logos/favicon-16x16.png",
    "/logos/favicon-32x32.png",
    "/logos/favicon.svg",
    "/logos/logo-main.png",
    "/logos/logo-mobile.svg",
    "/logos/site.webmanifest"
  ]
};

// node_modules/.pnpm/wrangler@4.56.0_@cloudflare+workers-types@4.20251217.0/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "C:\\Users\\Poste\\Desktop\\SaaS Astro\\freecipies-blog\\.wrangler\\tmp\\pages-l9zs4e\\bundledWorker-0.9148731233301914.mjs";
import { isRoutingRuleMatch } from "C:\\Users\\Poste\\Desktop\\SaaS Astro\\freecipies-blog\\node_modules\\.pnpm\\wrangler@4.56.0_@cloudflare+workers-types@4.20251217.0\\node_modules\\wrangler\\templates\\pages-dev-util.ts";
export * from "C:\\Users\\Poste\\Desktop\\SaaS Astro\\freecipies-blog\\.wrangler\\tmp\\pages-l9zs4e\\bundledWorker-0.9148731233301914.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=94t0t670opk.js.map
