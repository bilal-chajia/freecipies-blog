globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, m as maybeRenderHead, ag as addAttribute, a as renderTemplate } from './astro/server_Bsmdvglz.mjs';

const $$Astro = createAstro("https://localhost:4321");
const $$FormattedDate = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$FormattedDate;
  const { date } = Astro2.props;
  if (!date) {
    return null;
  }
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  return renderTemplate`${maybeRenderHead()}<time${addAttribute(dateObj.toISOString(), "datetime")}> ${dateObj.toLocaleDateString("en-us", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })} </time>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/FormattedDate.astro", void 0);

export { $$FormattedDate as $ };
