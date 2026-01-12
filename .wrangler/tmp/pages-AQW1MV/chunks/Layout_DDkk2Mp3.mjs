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

import { c as createAstro, a as createComponent, b as addAttribute, r as renderTemplate, m as maybeRenderHead, f as renderScript, d as renderComponent, F as Fragment, i as renderSlot, e as renderHead } from './astro/server_B79ahsw9.mjs';
/* empty css                          */

const SITE_TITLE = "Astro Blog";

const $$Astro$2 = createAstro("https://localhost:4321");
const $$BaseHead = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$BaseHead;
  const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=630&fit=crop";
  const siteUrl = Astro2.site?.toString() || Astro2.url.origin;
  const canonicalURL = new URL(Astro2.url.pathname, siteUrl);
  const { title, description, image } = Astro2.props;
  const imageSrc = image ? typeof image === "string" ? image : image.src : FALLBACK_IMAGE_URL;
  const imageUrl = new URL(imageSrc, siteUrl);
  return renderTemplate`<!-- Global Metadata --><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><!-- Favicons - use uploaded if available, otherwise fallback -->${renderTemplate`<link rel="icon" type="image/svg+xml" href="/logos/favicon.svg">` }${renderTemplate`<link rel="icon" type="image/png" sizes="32x32" href="/logos/favicon-32x32.png">`}${renderTemplate`<link rel="icon" type="image/png" sizes="16x16" href="/logos/favicon-16x16.png">`}${renderTemplate`<link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png">`}${renderTemplate`<link rel="manifest" href="/logos/site.webmanifest">`}<link rel="sitemap"${addAttribute(new URL("sitemap-index.xml", siteUrl), "href")}><link rel="alternate" type="application/rss+xml"${addAttribute(SITE_TITLE, "title")}${addAttribute(new URL("rss.xml", siteUrl), "href")}><meta name="generator"${addAttribute(Astro2.generator, "content")}><!-- Font preloads - Using Google Fonts for Atkinson Hyperlegible --><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet"><!-- Canonical URL --><link rel="canonical"${addAttribute(canonicalURL, "href")}><!-- Primary Meta Tags --><title>${title}</title><meta name="title"${addAttribute(title, "content")}><meta name="description"${addAttribute(description, "content")}><meta name="robots" content="index, follow"><!-- Open Graph / Facebook --><meta property="og:type" content="website"><meta property="og:url"${addAttribute(canonicalURL, "content")}><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:image"${addAttribute(imageUrl, "content")}><!-- Twitter --><meta property="twitter:card" content="summary_large_image"><meta property="twitter:url"${addAttribute(canonicalURL, "content")}><meta property="twitter:title"${addAttribute(title, "content")}><meta property="twitter:description"${addAttribute(description, "content")}><meta property="twitter:image"${addAttribute(imageUrl, "content")}>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/BaseHead.astro", void 0);

const $$Astro$1 = createAstro("https://localhost:4321");
const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Header;
  const currentPath = Astro2.url.pathname;
  const logoMain = "/logos/logo-main.png";
  return renderTemplate`${maybeRenderHead()}<header class="site-header" data-astro-cid-3ef6ksr2> <a href="#main-content" class="skip-link" data-astro-cid-3ef6ksr2>Skip to content</a> <div class="header-container" data-astro-cid-3ef6ksr2> <div class="header-content" data-astro-cid-3ef6ksr2> <!-- Logo --> <a href="/" class="logo" data-astro-cid-3ef6ksr2> ${renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-3ef6ksr2": true }, { "default": ($$result2) => renderTemplate` <img${addAttribute(logoMain, "src")} alt="Freecipies" class="logo-img logo-light" width="200" height="60" data-astro-cid-3ef6ksr2> ${renderTemplate`<img${addAttribute(logoMain, "src")} alt="Freecipies" class="logo-img logo-dark" width="200" height="60" data-astro-cid-3ef6ksr2>`}` })}` } </a> <!-- Desktop Navigation --> <nav class="desktop-nav" data-astro-cid-3ef6ksr2> <a href="/categories"${addAttribute([
    "nav-link",
    { active: currentPath.startsWith("/categories") }
  ], "class:list")} data-astro-cid-3ef6ksr2>
Categories
</a> <a href="/recipes"${addAttribute([
    "nav-link",
    { active: currentPath.startsWith("/recipes") }
  ], "class:list")} data-astro-cid-3ef6ksr2>
Explore
</a> <a href="/authors"${addAttribute([
    "nav-link",
    { active: currentPath.startsWith("/authors") }
  ], "class:list")} data-astro-cid-3ef6ksr2>
Authors
</a> <a href="/about"${addAttribute(["nav-link", { active: currentPath === "/about" }], "class:list")} data-astro-cid-3ef6ksr2>
About
</a> <a href="/contact"${addAttribute(["nav-link", { active: currentPath === "/contact" }], "class:list")} data-astro-cid-3ef6ksr2>
Contact
</a> </nav> <!-- Search & Mobile Menu --> <div class="header-actions" data-astro-cid-3ef6ksr2> <button class="search-btn" aria-label="Search" title="Quick and easy search" aria-controls="search-modal" aria-expanded="false" data-astro-cid-3ef6ksr2> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-3ef6ksr2> <circle cx="11" cy="11" r="8" data-astro-cid-3ef6ksr2></circle> <path d="m21 21-4.35-4.35" data-astro-cid-3ef6ksr2></path> </svg> </button> <button class="mobile-menu-btn" aria-label="Show menu" aria-controls="mobile-nav" aria-expanded="false" data-astro-cid-3ef6ksr2> <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-3ef6ksr2> <line x1="3" y1="12" x2="21" y2="12" data-astro-cid-3ef6ksr2></line> <line x1="3" y1="6" x2="21" y2="6" data-astro-cid-3ef6ksr2></line> <line x1="3" y1="18" x2="21" y2="18" data-astro-cid-3ef6ksr2></line> </svg> </button> </div> </div> </div> <!-- Mobile Navigation --> <nav class="mobile-nav" id="mobile-nav" data-astro-cid-3ef6ksr2> <a href="/categories" class="mobile-nav-link" data-astro-cid-3ef6ksr2>Categories</a> <a href="/recipes" class="mobile-nav-link" data-astro-cid-3ef6ksr2>Explore</a> <a href="/authors" class="mobile-nav-link" data-astro-cid-3ef6ksr2>Authors</a> <a href="/about" class="mobile-nav-link" data-astro-cid-3ef6ksr2>About</a> <a href="/contact" class="mobile-nav-link" data-astro-cid-3ef6ksr2>Contact</a> </nav> <!-- Search Modal --> <div class="search-modal" id="search-modal" role="dialog" aria-modal="true" aria-hidden="true" data-astro-cid-3ef6ksr2> <div class="search-modal-content" data-astro-cid-3ef6ksr2> <div class="search-header" data-astro-cid-3ef6ksr2> <h2 id="search-title" data-astro-cid-3ef6ksr2>Search Recipes</h2> <button class="close-search" aria-label="Close search" data-astro-cid-3ef6ksr2> <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-3ef6ksr2> <line x1="18" y1="6" x2="6" y2="18" data-astro-cid-3ef6ksr2></line> <line x1="6" y1="6" x2="18" y2="18" data-astro-cid-3ef6ksr2></line> </svg> </button> </div> <form action="/search" method="GET" class="search-form" data-astro-cid-3ef6ksr2> <input type="search" name="q" placeholder="Search for recipes..." autocomplete="off" class="search-input" data-astro-cid-3ef6ksr2> <button type="submit" class="search-submit" data-astro-cid-3ef6ksr2>Search</button> </form> </div> </div> </header>  ${renderScript($$result, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/Header.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/Header.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return renderTemplate`${maybeRenderHead()}<footer class="site-footer" data-astro-cid-sz7xmlte> <div class="footer-container" data-astro-cid-sz7xmlte> <div class="footer-grid" data-astro-cid-sz7xmlte> <!-- Column 1 --> <div class="footer-column" data-astro-cid-sz7xmlte> <h3 data-astro-cid-sz7xmlte>Main Pages</h3> <ul data-astro-cid-sz7xmlte> <li data-astro-cid-sz7xmlte><a href="/" data-astro-cid-sz7xmlte>Home</a></li> <li data-astro-cid-sz7xmlte><a href="/authors" data-astro-cid-sz7xmlte>Writers</a></li> <li data-astro-cid-sz7xmlte><a href="/categories" data-astro-cid-sz7xmlte>Topics</a></li> <li data-astro-cid-sz7xmlte><a href="/tags" data-astro-cid-sz7xmlte>Keywords</a></li> <li data-astro-cid-sz7xmlte><a href="/favorites" data-astro-cid-sz7xmlte>Favorites</a></li> </ul> </div> <!-- Column 2 --> <div class="footer-column" data-astro-cid-sz7xmlte> <h3 data-astro-cid-sz7xmlte>Content</h3> <ul data-astro-cid-sz7xmlte> <li data-astro-cid-sz7xmlte><a href="/recipes" data-astro-cid-sz7xmlte>Discover</a></li> <li data-astro-cid-sz7xmlte><a href="/blog" data-astro-cid-sz7xmlte>Posts</a></li> <li data-astro-cid-sz7xmlte><a href="/recipes" data-astro-cid-sz7xmlte>Recipes</a></li> <li data-astro-cid-sz7xmlte><a href="/about" data-astro-cid-sz7xmlte>About Us</a></li> <li data-astro-cid-sz7xmlte><a href="/privacy" data-astro-cid-sz7xmlte>Privacy</a></li> </ul> </div> <!-- Column 3 --> <div class="footer-column" data-astro-cid-sz7xmlte> <h3 data-astro-cid-sz7xmlte>Support</h3> <ul data-astro-cid-sz7xmlte> <li data-astro-cid-sz7xmlte><a href="/faqs" data-astro-cid-sz7xmlte>FAQs</a></li> <li data-astro-cid-sz7xmlte><a href="/contact" data-astro-cid-sz7xmlte>Contact</a></li> <li data-astro-cid-sz7xmlte><a href="/search" data-astro-cid-sz7xmlte>Search</a></li> <li data-astro-cid-sz7xmlte><a href="/sitemap.xml" data-astro-cid-sz7xmlte>Sitemap</a></li> <li data-astro-cid-sz7xmlte><a href="/rss.xml" data-astro-cid-sz7xmlte>RSS</a></li> </ul> </div> </div> <!-- Social --> <div class="footer-social" data-astro-cid-sz7xmlte> <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" data-astro-cid-sz7xmlte> <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-sz7xmlte> <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" data-astro-cid-sz7xmlte></path> </svg> </a> <a href="https://pinterest.com" target="_blank" rel="noopener" aria-label="Pinterest" data-astro-cid-sz7xmlte> <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-sz7xmlte> <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" data-astro-cid-sz7xmlte></path> </svg> </a> <a href="mailto:contact@recipes-saas.com" aria-label="Email" data-astro-cid-sz7xmlte> <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-sz7xmlte> <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" data-astro-cid-sz7xmlte></path> <polyline points="22,6 12,13 2,6" data-astro-cid-sz7xmlte></polyline> </svg> </a> </div> <!-- Copyright --> <div class="footer-bottom" data-astro-cid-sz7xmlte> <p data-astro-cid-sz7xmlte>
&copy; ${currentYear} Freecipies. All rights reserved. <span class="version" data-astro-cid-sz7xmlte>V6.0</span> </p> </div> </div> </footer> `;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/components/Footer.astro", void 0);

const $$Astro = createAstro("https://localhost:4321");
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title, description, image } = Astro2.props;
  return renderTemplate`<html lang="en"> <head>${renderComponent($$result, "BaseHead", $$BaseHead, { "title": title, "description": description, "image": image })}${renderSlot($$result, $$slots["head"])}${renderHead()}</head> <body class="min-h-screen flex flex-col bg-white dark:bg-gray-900"> ${renderComponent($$result, "Header", $$Header, {})} <main id="main-content" class="flex-1"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} </body></html>`;
}, "C:/Users/Poste/Desktop/SaaS Astro/freecipies-blog/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
