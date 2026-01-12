globalThis.process ??= {}; globalThis.process.env ??= {};
import { ae as createAstro, c as createComponent, a as renderTemplate, ax as defineScriptVars, r as renderComponent, al as renderSlot, b as renderHead } from '../../chunks/astro/server_Bsmdvglz.mjs';
import { r as renderEntry, g as getCollection } from '../../chunks/_astro_content_vlrHdBbD.mjs';
import { $ as $$Image } from '../../chunks/_astro_assets_OFKDI66F.mjs';
import { b as $$Footer, a as $$Header, $ as $$BaseHead } from '../../chunks/Footer_Cph29Zmj.mjs';
import { $ as $$FormattedDate } from '../../chunks/FormattedDate_CZgWS3pn.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro$1 = createAstro("https://localhost:4321");
const $$BlogPost = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$BlogPost;
  const { title, description, pubDate, updatedDate, heroImage, slug } = Astro2.props;
  return renderTemplate(_a || (_a = __template(['<html lang="en" data-astro-cid-bvzihdzo> <head>', "", "</head> <body data-astro-cid-bvzihdzo> ", ' <main data-astro-cid-bvzihdzo> <article data-astro-cid-bvzihdzo> <div class="hero-image" data-astro-cid-bvzihdzo> ', ' </div> <div class="prose" data-astro-cid-bvzihdzo> <div class="title" data-astro-cid-bvzihdzo> <div class="date" data-astro-cid-bvzihdzo> ', " ", ' <span id="view-count" class="view-count" data-astro-cid-bvzihdzo></span> </div> <h1 data-astro-cid-bvzihdzo>', "</h1> <hr data-astro-cid-bvzihdzo> </div> ", " </div> </article> </main> ", " <script>(function(){", '\n		if (slug) {\n			// Track view\n			const track = async () => {\n				try {\n					await fetch(`/api/views/${slug}`, { method: "POST" });\n				} catch (e) {}\n			};\n\n			if (document.readyState === "complete") track();\n			else window.addEventListener("load", track);\n\n			// Fetch count to display\n			fetch(`/api/views/${slug}`)\n				.then((res) => res.json())\n				.then((data) => {\n					const el = document.getElementById("view-count");\n					if (el && data.viewCount !== undefined) {\n						el.textContent = ` \u2022 ${new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(data.viewCount)} views`;\n					}\n				})\n				.catch(() => {});\n		}\n	})();<\/script> </body></html>'], ['<html lang="en" data-astro-cid-bvzihdzo> <head>', "", "</head> <body data-astro-cid-bvzihdzo> ", ' <main data-astro-cid-bvzihdzo> <article data-astro-cid-bvzihdzo> <div class="hero-image" data-astro-cid-bvzihdzo> ', ' </div> <div class="prose" data-astro-cid-bvzihdzo> <div class="title" data-astro-cid-bvzihdzo> <div class="date" data-astro-cid-bvzihdzo> ', " ", ' <span id="view-count" class="view-count" data-astro-cid-bvzihdzo></span> </div> <h1 data-astro-cid-bvzihdzo>', "</h1> <hr data-astro-cid-bvzihdzo> </div> ", " </div> </article> </main> ", " <script>(function(){", '\n		if (slug) {\n			// Track view\n			const track = async () => {\n				try {\n					await fetch(\\`/api/views/\\${slug}\\`, { method: "POST" });\n				} catch (e) {}\n			};\n\n			if (document.readyState === "complete") track();\n			else window.addEventListener("load", track);\n\n			// Fetch count to display\n			fetch(\\`/api/views/\\${slug}\\`)\n				.then((res) => res.json())\n				.then((data) => {\n					const el = document.getElementById("view-count");\n					if (el && data.viewCount !== undefined) {\n						el.textContent = \\` \u2022 \\${new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" }).format(data.viewCount)} views\\`;\n					}\n				})\n				.catch(() => {});\n		}\n	})();<\/script> </body></html>'])), renderComponent($$result, "BaseHead", $$BaseHead, { "title": title, "description": description, "data-astro-cid-bvzihdzo": true }), renderHead(), renderComponent($$result, "Header", $$Header, { "data-astro-cid-bvzihdzo": true }), heroImage && renderTemplate`${renderComponent($$result, "Image", $$Image, { "width": 1020, "height": 510, "src": heroImage, "alt": "", "data-astro-cid-bvzihdzo": true })}`, renderComponent($$result, "FormattedDate", $$FormattedDate, { "date": pubDate, "data-astro-cid-bvzihdzo": true }), updatedDate && renderTemplate`<div class="last-updated-on" data-astro-cid-bvzihdzo>
Last updated on${" "} ${renderComponent($$result, "FormattedDate", $$FormattedDate, { "date": updatedDate, "data-astro-cid-bvzihdzo": true })} </div>`, title, renderSlot($$result, $$slots["default"]), renderComponent($$result, "Footer", $$Footer, { "data-astro-cid-bvzihdzo": true }), defineScriptVars({ slug }));
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/layouts/BlogPost.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post
  }));
}
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$;
  const post = Astro2.props;
  const { Content } = await renderEntry(post);
  return renderTemplate`${renderComponent($$result, "BlogPost", $$BlogPost, { ...post.data, "slug": post.id }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Content", Content, {})} ` })}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/blog/[...slug].astro", void 0);

const $$file = "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/pages/blog/[...slug].astro";
const $$url = "/blog/[...slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$,
	file: $$file,
	getStaticPaths,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
