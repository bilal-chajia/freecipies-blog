globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, b as renderHead, r as renderComponent, a as renderTemplate } from '../../chunks/astro/server_Bsmdvglz.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const prerender = false;
const $$ = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en" data-astro-cid-oigiyrrr> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin Panel -</title>${renderHead()}</head> <body data-astro-cid-oigiyrrr> <div id="admin-root" data-astro-cid-oigiyrrr> ${renderComponent($$result, "AdminApp", null, { "client:only": "react", "client:component-hydration": "only", "data-astro-cid-oigiyrrr": true, "client:component-path": "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/admin/AdminApp", "client:component-export": "default" })} </div> </body></html>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/admin/[...path].astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/admin/[...path].astro";
const $$url = "/admin/[...path]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
