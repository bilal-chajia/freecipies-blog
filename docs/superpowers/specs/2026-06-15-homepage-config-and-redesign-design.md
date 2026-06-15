# Homepage Configuration Engine + Component Redesign — Design

> **Date:** 2026-06-15
> **Status:** Draft for review
> **Owner:** Freecipies Dev
> **Branch (suggested):** `feat/homepage-config-redesign`

## 1. Context

Freecipies is a food & recipes SaaS (Astro SSR public site + React admin + Cloudflare D1/R2/KV).
The objective for the homepage is editorial quality **and** top placement in search
engines and AI answer engines (Google AI Overviews, ChatGPT, Perplexity, Claude).

Today there are three disconnected layers:

- **Public** — [`src/pages/index.astro`](../../../src/pages/index.astro) (1267 lines, single file):
  every section, title and copy is hardcoded in English; recipes are picked with
  `slice(0, n)`; the newsletter is static. There is **no `<h1>`** (the hero title is an
  `h2`). Only `homepage_settings.seo` is read.
- **Admin** — [`src/admin/features/homepage/pages/Homepage.tsx`](../../../src/admin/features/homepage/pages/Homepage.tsx):
  a polished 8-section UI that is a **non-persisted mockup**. `handleSave` runs
  `setTimeout(800)` then writes to a Zustand store. No API call, no DB write, and its
  `camelCase` shape does not match the settings contract.
- **Contract** — [`docs/SITE_SETTINGS_TABLE_CONTRACT.md`](../../SITE_SETTINGS_TABLE_CONTRACT.md):
  `homepage_settings` defines **only `seo`**. No section configuration exists.

A clean, complete reference pattern already exists — the **category-page settings** rail:
[service](../../../src/modules/settings/services/settings.service.ts) →
[API GET/PUT + Zod](../../../src/pages/api/settings/category-page.ts) → admin. We extend the
homepage onto the same rail.

## 2. Goals / Non-Goals

**Goals**

1. Make the homepage genuinely configurable from the admin (enable/disable, reorder, and
   configure each section), persisted in `site_settings.homepage_settings`.
2. Redesign the existing components and add new sections inspired by leading food blogs
   (NYT Cooking, Pinch of Yum, Sally's Baking Addiction, Budget Bytes, Serious Eats), with
   tasteful, performant animations.
3. Maximise SEO/AEO: real `<h1>`, structured data (`WebSite`+`SearchAction`,
   `Organization`, `ItemList`, `FAQPage`), internal linking, freshness signals.
4. Keep Lighthouse at current levels (home 100/100/100/100) and stay WCAG AA.

**Non-Goals**

- No real newsletter subscription backend in this scope (configurable copy + existing form
  only; a Cloudflare subscribe endpoint is a separate future spec).
- No free-form page builder. The model is a **fixed catalog of section types** that can be
  toggled, reordered, and configured (decision below).
- No new view/analytics time-series tables ("popular by views" stays best-effort / off by
  default; we have no reliable historical view data).
- No changes to other settings domains, the BlockEditor, or article/recipe contracts.

## 3. Decisions (from brainstorming)

| Axis | Decision |
|---|---|
| Configuration model | **Fixed catalog, toggle + reorder + per-section config.** No free builder. |
| Featured/popular sourcing | **Hybrid** — hero/featured curated manually; latest/by-category automatic. |
| SEO/AEO depth | **Full** — `<h1>` + `WebSite`/`SearchAction` + `Organization` + `ItemList` + `FAQPage`. |
| Scope | **Full vision in one spec, implemented in phases P0→P3** with review at each phase. |
| Contract | **Authorized** to extend `SITE_SETTINGS_TABLE_CONTRACT.md` (`homepage_settings.sections`). |
| Components | **Redesign** existing components (not visual parity) + add new ones, with animations. |

## 4. Architecture — Configuration Engine

Recreate the category-page rail, extended:

```
docs (contract)
  → src/modules/settings/types/settings.types.ts   (HomepageSettings + section types + defaults)
  → src/shared/validation/schemas/settings          (Zod, discriminated union by section.type)
  → src/modules/settings/services/settings.service.ts (getHomepageSettings [extend] + updateHomepageSettings + KV invalidation)
  → src/pages/api/settings/homepage.ts               (GET/PUT, formatSuccess/ErrorResponse, validateBody)
  → src/admin/features/homepage/*                    (real API wiring, snake_case, reorder, pickers)
  → src/pages/index.astro + src/site/components/home/* (settings-driven render)
```

### 4.1 Extended `homepage_settings` shape

Stored as JSON text in `site_settings` (snake_case per `docs/NAMING_CONTRACT.md`):

```jsonc
{
  "seo": { /* PageSeoSettings — UNCHANGED */ },
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "enabled": true,
      "mode": "slider",            // "slider" | "grid"
      "show_search": true,
      "refs": [ { "article_id": 12, "headline": "...", "route": "/recipes/...", "category": { "label": "...", "slug": "...", "color": "#..." } } ]
    },
    { "id": "featured", "type": "featured_recipes", "enabled": true,
      "title": "...", "subtitle": "...", "source": "manual",  // "manual" | "category" | "latest"
      "category_slug": null, "count": 4, "refs": [ /* light recipe refs */ ] },
    { "id": "categories", "type": "category_browse", "enabled": true, "title": "...", "subtitle": "...", "max": 8 },
    { "id": "collections", "type": "collections", "enabled": true, "title": "...", "subtitle": "...",
      "refs": [ { "roundup_id": 4, "title": "...", "route": "/roundups/..." } ] },
    { "id": "latest", "type": "latest", "enabled": true, "title": "...", "count": 8 },
    { "id": "about", "type": "about_author", "enabled": true, "author_id": null /* null = is_featured */ },
    { "id": "newsletter", "type": "newsletter", "enabled": true, "title": "...", "subtitle": "...", "button_text": "...", "placeholder_text": "..." },
    { "id": "faq", "type": "faq", "enabled": false, "title": "...", "items": [ { "question": "...", "answer": "..." } ] }
    /* available but OFF by default: quick_filters, seasonal_spotlight, popular, social_proof, lead_magnet, social_feed, banner */
  ]
}
```

- `sections` is an **ordered array**; array order is render order (satisfies reorder).
- Each section has `id` (stable), `type` (from the catalog), `enabled`.
- Validation is a **Zod discriminated union on `type`**; unknown types are rejected.

### 4.2 Content references — light refs, resolve live at render

Manual sections store **light references** (stable id + minimal display fields needed for
instant text render), **not** full image snapshots:

- Recipe ref: `{ article_id, headline, route, category{label,slug,color} }`
- Roundup ref: `{ roundup_id, title, route }`
- Author ref: `author_id` (or `null` → fall back to `is_featured`)

Images and any heavy fields are **resolved at render** by batch-fetching the live rows
(one `WHERE id IN (...)` per content type via the existing modules). Rationale:

- Hero/featured need large responsive images (`srcset`); embedding `lg` variants in the
  settings JSON would bloat the payload and go stale.
- Images stay fresh when an editor updates a recipe without re-saving homepage settings.
- The settings read itself is KV-cached; the per-type batched query is cheap and bounded.

This is a deliberate divergence from the pure-snapshot menu pattern, justified by image
size and freshness. Text labels are snapshotted so a section still renders meaningfully if
a referenced row is missing (it is then skipped from image resolution).

> Image resolution follows `docs/IMAGE_JSON_CONTRACT.md`. `r2_key` stays server-side; the
> Astro SSR render resolves to public `url` (never exposed raw to the client).

### 4.3 Caching & invalidation

- Public reads via `getPublicHomepageSettings()` (already KV-cached,
  `site_settings:v1:homepage_settings`).
- `updateHomepageSettings` write-through updates the KV entry (same as
  `updateCategoryPageSettings`).
- Admin preview can force a fresh read.

## 5. Section Catalog

| `type` | Source | Default | Key config fields |
|---|---|---|---|
| `stories` | live (existing `StoriesBar`) | ON | — |
| `hero` | manual refs | ON | `mode`, `show_search`, `refs[]` |
| `quick_filters` | config | OFF | `title`, `filters[]` (`label`, `href`) |
| `featured_recipes` | hybrid | ON | `title`, `subtitle`, `source`, `category_slug`, `count`, `refs[]` |
| `category_browse` | live | ON | `title`, `subtitle`, `max` |
| `collections` | manual refs (roundups) | ON | `title`, `subtitle`, `refs[]` |
| `seasonal_spotlight` | config + 1 link | OFF | `title`, `body`, `image`, `cta{label,href}` |
| `popular` | live (best-effort) | OFF | `title`, `count` |
| `latest` | live | ON | `title`, `count` |
| `social_proof` | config | OFF | `title`, `stats[]` / `testimonials[]`, `logos[]` |
| `about_author` | manual / `is_featured` | ON | `author_id` |
| `faq` | config | OFF | `title`, `items[]` (`question`, `answer`) → `FAQPage` |
| `lead_magnet` | config | OFF | `title`, `body`, `image`, `cta` |
| `social_feed` | config | OFF | `network`, `handle`, `embed` |
| `newsletter` | config | ON | `title`, `subtitle`, `button_text`, `placeholder_text` |
| `banner` | config | OFF | `title`, `body`, `image`, `link`, `position` |

**Default section order** (ON): `stories → hero → featured_recipes → category_browse →
collections → latest → about_author → newsletter`. The remaining types ship in the catalog
but `enabled: false`, so the default page stays focused while the full toolbox is available.

## 6. Public Render Refactor

Break the monolithic `index.astro` into focused, independently testable components
(CLAUDE rule: focused files; brainstorming: design for isolation):

```
src/site/components/home/
  HomeSections.astro        # dispatcher: maps section.type → component, renders in order
  HeroSection.astro
  FeaturedRecipes.astro
  CategoryBrowse.astro
  Collections.astro
  SeasonalSpotlight.astro
  QuickFilters.astro
  SocialProof.astro
  HomeFaq.astro
  LeadMagnet.astro
  AboutAuthor.astro
  NewsletterBanner.astro
  SocialFeed.astro
src/site/utils/home-data.ts     # batch-resolve refs + live lists for the active sections
src/site/utils/home-jsonld.ts   # build WebSite/SearchAction, Organization, ItemList, FAQPage
```

`index.astro` becomes thin:

1. `getPublicHomepageSettings()` → `{ seo, sections }`.
2. `resolveHomeData(sections)` → batched live data for sections that need it.
3. Emit `<h1>` + JSON-LD.
4. Delegate to `<HomeSections>`.

**Fallback / no-regression guard:** when `sections` is absent (before the first admin
save), use a hardcoded `DEFAULT_HOME_SECTIONS` constant equal to the redesigned default
layout. The page must render correctly with zero stored configuration.

Each section component:
- Receives a typed prop matching its section config + its resolved data.
- Renders nothing (returns null) when its referenced data is empty, so the page never shows
  an empty shell.
- Owns its own scoped styles.

## 7. Design & Motion Language (component redesign)

Redesign the existing cards/hero/sections and the new ones into a cohesive, modern,
editorial system inspired by leading food blogs — **without** drifting from the brand.

**Brand & tokens (hard constraint).** Use only design tokens from
`src/shared/design-tokens.css` and `src/site/styles/site-theme.css` (Playfair Display
headings, Source Sans 3 body, forest `#2a5c36` / sage `#6b8f71` / golden `#d8a43e`). No new
hardcoded colors/fonts.

**Visual direction.**
- Generous whitespace, large premium food photography, confident serif headlines with an
  italic eyebrow accent, golden micro-accents, rounded cards with soft elevation.
- Consistent card system across sections (image ratio, badge, title clamp, meta row) so
  redesigned and new sections feel like one family.
- Each section has a clear scannable heading (good for AEO extraction).

**Motion (performant + accessible).**
- Reuse the existing `data-fade-up` IntersectionObserver in
  [`global-enhancements.ts`](../../../src/site/scripts/global-enhancements.ts) for
  reveal-on-scroll (opt-in, anti-flash). Add per-item stagger via CSS custom property delay.
- Allowed: hover lift (`translateY`), image zoom (`scale`) on card hover, slider
  cross-fade/slide, button/badge micro-interactions, gradient sheen on hero.
- **Transforms/opacity only** (GPU-friendly, no layout/CWV impact); fixed image
  `width`/`height` / `aspect-ratio` to keep CLS at 0.
- **`@media (prefers-reduced-motion: reduce)`** disables non-essential motion globally.
- No animation on LCP-critical hero image load (keep `fetchpriority="high"`, eager).

**Component inspiration & carousel engine.**
Visual/UX inspiration is drawn from shadcn-studio (Embla-based carousels, incl. an animated
variant using Motion), Embla's own demos, and modern CSS card carousels with progress
indicators / circular SVG dots. shadcn components themselves are React + Tailwind and are
**not** used on the public Astro site; we reuse the underlying engine and the visual ideas.

- **Engine: Embla Carousel vanilla core** (`embla-carousel`, framework-agnostic, dependency
  free, ~5KB) + optional plugins `embla-carousel-autoplay` / `embla-carousel-auto-scroll`.
  Embla owns interaction/physics; **CSS owns layout** (slide sizing/overflow) — a good fit
  for Astro. It also replaces the current hand-rolled hero slider JS in `index.astro` (better
  swipe, keyboard nav, a11y, less bespoke code).
- **Progressive enhancement (mandatory for SEO/AEO + CWV):** every carousel is rendered
  server-side as a horizontally scrollable **CSS `scroll-snap`** list of real slide markup.
  It is usable (swipe/scroll) with **no JS**, so all slides are in the crawlable HTML and the
  first slide is static for LCP. Embla then upgrades it (buttons, dots, autoplay) after load.
- **Where carousels apply:** `hero` (single-slide slider), `featured_recipes` (multi-item),
  `collections` (multi-item), and optionally `social_proof` testimonials. `category_browse`,
  `latest`, and `quick_filters` stay as responsive grids/chip rows (reveal via `data-fade-up`,
  no carousel).
- **Autoplay rules:** disabled under `prefers-reduced-motion`; pauses on hover/focus/pointer
  (Embla default); never autoplays the hero faster than the current 5s cadence; always
  keyboard-operable with visible focus and `aria` on controls.
- Embla is loaded only on pages that have a carousel and initialized after first paint
  (deferred), so it does not block the LCP hero.
- Admin (React) may use shadcn/Embla carousels directly if a preview needs one, but the admin
  is form-driven and does not require it now.

**Accessibility (hard constraint).** WCAG AA contrast (respect recent `--text-tertiary`
fix), ≥24px target sizes (respect recent card-title fix), visible focus, semantic landmarks,
one `<h1>` then logical heading order.

> Concrete per-component visual specs (layout, states, animation timing) are detailed in
> the implementation plan; if helpful we can produce browser mockups before P3.

## 8. SEO / AEO

- **`<h1>`** on the homepage (e.g. `site_identity.tagline` or a configurable hero heading).
- **JSON-LD** built in `home-jsonld.ts`:
  - `WebSite` + `potentialAction` `SearchAction` (sitelinks search box) → `/recipes?q={search_term_string}` (or the real search route).
  - `Organization` / publisher from existing `organization_profile` + `public_social_links` (`sameAs`).
  - `ItemList` of the featured/hero recipes (position + url + name).
  - `FAQPage` from the `faq` section when enabled.
- Functional recipe **search bar** in the hero (`show_search`), wired to the search route.
- Internal linking: home → category/collection hubs; freshness via `latest` + `seasonal`.
- CWV preserved (no regression to current Lighthouse 100s).

> No JSON-LD is stored in settings; it is generated from source settings at render
> (consistent with the SITE_SETTINGS contract).

## 9. Admin

- Replace the mockup in `Homepage.tsx`: load via `GET /api/settings/homepage`, save via
  `PUT /api/settings/homepage`; remove the Zustand-only fake save.
- Migrate the admin form shape to **snake_case** aligned with the contract; map the existing
  8 section editors to the new typed section configs and add editors for the new types.
- Section list: **drag-to-reorder** + enable toggle (toggle UI already exists) writing back
  into the ordered `sections` array.
- **Pickers** for manual refs (recipes, roundups, author) — reuse the picker used by the
  category "featured" snapshot flow.
- "Publish" persists; "Preview" opens `/` with a fresh read.
- `src/admin` must not import `@server/*` (boundary): admin talks only to the HTTP API.

## 10. Phasing

Each phase is independently shippable, test-gated, and reviewed.

- **P0 — Contract + foundation.** Extend `SITE_SETTINGS_TABLE_CONTRACT.md`
  (`homepage_settings.sections` shape + rules). Extend `HomepageSettings` type + defaults
  + section type union. Add Zod discriminated-union schema. Extend `getHomepageSettings`
  (back-compat: missing `sections` → defaults) + add `updateHomepageSettings` with KV
  invalidation. Add `/api/settings/homepage` GET/PUT. (No visible change yet.)
- **P1 — Render rail + first redesign.** Split `index.astro` into `home/*` components +
  `HomeSections` dispatcher + `home-data` resolver; render from settings with
  `DEFAULT_HOME_SECTIONS` fallback. Redesign the existing sections (hero, featured/popular,
  category browse, about author, newsletter) with the new motion language. Add `<h1>` +
  `WebSite`/`SearchAction`/`Organization` JSON-LD.
- **P2 — Real admin config.** Wire `Homepage.tsx` to the API (snake_case), reordering,
  pickers, preview. End-to-end save→reload verified.
- **P3 — New sections + full AEO.** `collections`, `seasonal_spotlight`, `quick_filters`,
  `social_proof`, `faq` (+`FAQPage`), `lead_magnet`, `social_feed`, hero search bar,
  `ItemList` JSON-LD.

## 11. Testing Strategy (TDD)

- **Unit (Vitest):** Zod schema accept/reject per section type; `getHomepageSettings`
  back-compat (no `sections`, partial `sections`); `updateHomepageSettings` round-trip +
  cache write-through; ref normalization; `home-jsonld` builders (WebSite/Org/ItemList/FAQ);
  section dispatcher mapping; "render nothing when empty" behavior.
- **Boundaries:** `pnpm check:boundaries` (admin ↮ `@server`, site ↮ CF bindings, modules
  UI-free).
- **Manual / E2E (user-driven save→reload on `pnpm dev`):** edit each section in admin,
  publish, reload `/`, confirm order/toggle/content; verify carousels work **with JS disabled**
  (scroll-snap) and enhanced with JS (buttons/dots/swipe/keyboard); verify reduced-motion
  disables autoplay; validate JSON-LD with Google Rich Results; Lighthouse re-check (no
  regression).
- `pnpm test` + `tsc` green before each phase merge.

## 12. Risks & Mitigations

- **CWV regression from animations** → transforms/opacity only, fixed dimensions,
  reduced-motion, no motion on LCP hero. Re-run Lighthouse per phase.
- **Carousel JS weight / JS-dependence** → Embla vanilla core (~5KB) loaded only where a
  carousel exists and initialized after first paint; SSR `scroll-snap` slides keep the page
  functional and crawlable with no JS (LCP hero is static markup).
- **Settings payload bloat / stale images** → light refs + live render-time resolution.
- **Back-compat** → `getHomepageSettings` defaults `sections` when absent; `index.astro`
  fallback constant; existing `seo` untouched.
- **Admin boundary** → admin uses HTTP API only.
- **Scope creep (newsletter backend, analytics)** → explicitly out of scope.

## 13. Open Questions

1. Search route for `SearchAction` + hero search — is `/recipes?q=` the target, or is there
   a dedicated `/search` route to create/confirm?
2. `social_proof` content source — purely editor-entered (stats/testimonials in config), or
   should average rating / review counts be aggregated from recipe data later?

(Both can default safely — `/recipes?q=` and editor-entered — and be revisited in P3.)
