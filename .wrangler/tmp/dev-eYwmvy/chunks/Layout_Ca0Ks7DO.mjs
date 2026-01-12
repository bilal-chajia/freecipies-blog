globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, r as renderComponent, al as renderSlot, b as renderHead, a as renderTemplate } from './astro/server_Bsmdvglz.mjs';
import { $ as $$BaseHead, a as $$Header, b as $$Footer } from './Footer_Cph29Zmj.mjs';
/* empty css                          */

const $$Astro = createAstro("https://localhost:4321");
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title, description, image } = Astro2.props;
  return renderTemplate`<html lang="en"> <head>${renderComponent($$result, "BaseHead", $$BaseHead, { "title": title, "description": description, "image": image })}${renderSlot($$result, $$slots["head"])}${renderHead()}</head> <body class="min-h-screen flex flex-col bg-white dark:bg-gray-900"> ${renderComponent($$result, "Header", $$Header, {})} <main class="flex-1"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} </body></html>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
