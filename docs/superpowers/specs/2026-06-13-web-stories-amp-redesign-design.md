# Web Stories Redesign — Standards-Compliant Auto-Generated AMP Stories

> **Date:** 2026-06-13
> **Status:** Design — approved, pending spec review before planning
> **Topic:** Rebuild the existing "webstory" feature to project standards and to the Google Web Stories (AMP) standard.

## Problem

The current web-story feature is a hand-built MVP that violates project norms and
produces low-quality content:

- `src/server/site-data/presenters.ts` `presentStories` fabricates **3 placeholder
  pages** per story (page 2 is literally "Swipe to continue / Tap right to see more";
  pages 1 and 3 repeat the headline). No real, meaningful slides.
- `src/site/components/StoriesBar.astro` dumps the **entire article object** into a
  global `window.STORIES_DATA`, contains debug `console.log`, and uses inline scripts.
- `src/site/components/WebStoryViewer.astro` is a vanilla JS overlay riddled with
  `console.log`, inline styles duplicating its `<style>` block, a `window.openWebStory`
  global, and hardcoded **legacy orange** colors (`rgba(255,102,0,…)`) from the old brand.
- There is no contract, no typed slide model, and no SEO/discoverability surface.

## Goals

1. **Re-architecture to standards** — typed `Story` / `StorySlide` contract, server-side
   presenter, no `any`, snake_case JSON, design tokens, no `console.log`, no inline-style
   debugging, no client data dump, accessible markup. Slides become **real and meaningful**
   (no placeholders).
2. **Real Google Web Stories (strict AMP)** — each eligible article gets a strictly-valid
   `amp-story` page at its own URL, eligible for Google Discover / Search Web Story
   surfaces.
3. **Keep the on-site overlay experience** (Instagram-style bar → full-screen player),
   rebuilt on the **official `amp-story-player`** so the AMP pages are the single source
   of truth — no bespoke viewer to maintain.

Out of scope: an admin authoring/curation UI for stories (stories stay auto-generated
from existing article content).

## Key Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Scope | Re-architecture (auto-generated) **+** strict Google Web Stories (AMP/SEO) |
| On-site overlay | Approach A — official `amp-story-player` lightbox over the AMP pages |
| Eligible content | **All article types**; recipes get rich slides, others get cover + excerpt + CTA |
| Selection / ordering | Published + eligible, ordered by trending (`view_count`) over a recent window, fallback to most recent |
| Bar limit | **25** stories |
| Step slides cap | **≤ 7** key steps |
| Ingredient display | **8 max + "+N autres"** |
| Nutrition slide | **Yes**, only when `recipe_json.nutrition` is present and `status = "validated"` |
| Slide image pool | hero + recipe step images (`recipe_steps`) + content images (`content_json` image blocks) |
| AMP conformance | **Strict valid AMP** (Google eligible) |
| AMP validation workflow | Validate in `pnpm preview` (production-like) + AMP validator, not `pnpm dev` |

## Architecture

Single source of truth: the **`Story` model derived from an article**, built server-side,
rendered as a strict AMP page. The home bar and the overlay only point to / replay those
pages.

### Module layout

Split the current `src/server/site-data/stories.ts` and the stories portion of
`presenters.ts` into a dedicated folder:

```
src/server/site-data/stories/
  types.ts          # Story / StorySlide / StoryPreview / StoryImage contract types
  eligibility.ts    # isStoryEligible(article): shared by list + page
  build-preview.ts  # buildStoryPreview(article) -> StoryPreview (ring data only)
  build-story.ts    # buildStory(article) -> Story (full slides, public image URLs)
  list.ts           # getStories() -> StoryPreview[]; getStory(slug) -> Story | null
  index.ts          # re-exports
```

- `src/server/site-data/index.ts` re-exports the stories API.
- Remove `StoryPreview` / `StoryPageData` / `presentStories` from `presenters.ts`.

### Boundaries

- All D1 access and image resolution stays in `src/server`.
- `src/site` components receive only props/types; no Cloudflare bindings.
- No `r2_key` ever leaves the server — builders resolve images to public URLs.
- The client module touches only the DOM and the `amp-story-player` JS API.

### Data flow

1. **Home** (`src/pages/index.astro`) calls `getStories()` → `StoryPreview[]` → passes to
   `StoriesBar`. Light payload: no slides, no `r2_key`, no full article dump.
2. **Bar** (`StoriesBar.astro`, rewritten): circular rings are `<a href="/stories/<slug>">`
   (no-JS fallback). A hidden `<amp-story-player>` lists the same URLs. The client module
   `src/site/scripts/stories-player.ts` intercepts ring clicks and calls `player.show(url)`.
3. **AMP page** (`src/pages/stories/[slug].astro`): `getStory(slug)` → `buildStory` → renders
   strict AMP. `redirect('/404')` if not found or not eligible.

## Story Contract

`src/server/site-data/stories/types.ts` (snake_case in data, no `any`):

```ts
type StorySlideKind = 'cover' | 'ingredients' | 'step' | 'info' | 'cta';

interface StoryImage {
  url: string;        // resolved public URL (never r2_key)
  alt: string;
  width: number;
  height: number;
}

interface StorySlide {
  id: string;         // stable, e.g. "cover", "step-boil-water", "nutrition", "cta"
  kind: StorySlideKind;
  image?: StoryImage; // full-screen background
  heading?: string;
  body?: string;      // short text
  items?: string[];   // ingredients list (capped)
  meta?: { total_time?: string; servings?: string; rating?: string };
}

interface StoryPreview {
  slug: string;
  headline: string;
  image: StoryImage;  // ring thumbnail (public URL)
  href: string;       // /stories/<slug>
}

interface Story {
  slug: string;
  type: 'recipe' | 'article' | 'roundup';
  title: string;                 // headline
  publisher: string;             // site settings
  publisher_logo_url: string;
  poster_portrait_url: string;   // AMP-required
  poster_square_url?: string;
  poster_landscape_url?: string;
  canonical_url: string;         // /stories/<slug>
  target_url: string;            // full article CTA, e.g. /recipes/<slug>
  slides: StorySlide[];
}
```

## Slide Composition

### Image pool

Each slide draws its background from an ordered, de-duplicated pool, resolved server-side
to public URLs:

1. **hero** image (cover, CTA, and guaranteed fallback),
2. recipe **step** images (`images_json.recipe_steps` via the step `image_ref`), for step slides,
3. **content images** (`content_json` image blocks resolved through the same server-side
   resolution boundary the article body renderer uses) — especially for non-recipe `info`
   slides and as fill when a step has no dedicated image.

Avoid repeating the same image on consecutive slides when the pool allows it; otherwise
fall back to hero.

> Implementation note: the `content_json` image block is a marker (`{ type:'image',
> image_ref }`); the snapshot/variants are resolved server-side. The exact resolution
> helper to reuse will be pinned in the implementation plan, consistent with how the
> public article body renders content images today (no `r2_key` leak).

### Recipe articles

1. **cover** — hero image; `heading` = headline; `body` = short_description; `meta` =
   total_time / servings / rating when available.
2. **ingredients** — one slide; `items` = flattened ingredient names, **capped at 8** with
   a "+N autres" trailing entry when exceeded. Skipped if there are no ingredients.
3. **step** — up to **7** key step slides; `image` = resolved step image else next pool
   image else hero; `heading` = "Étape k"; `body` = step text (+ a short step `tip` when present).
4. **nutrition** (`info`) — only when `recipe_json.nutrition` is present and
   `status = "validated"`; calories + main macros; placed just before the CTA.
5. **cta** — hero image; `heading` = "Prête à cuisiner ?"; AMP `amp-story-page-outlink` → `target_url`.

A recipe with neither steps nor ingredients falls back to the non-recipe composition.

### Non-recipe articles (article / roundup)

1. **cover** — hero + headline + short_description.
2. **info** — 1–2 slides derived from `subtitle` / a short excerpt from `content_json`
   (background from the content-image pool). Skipped when nothing usable exists.
3. **cta** → `target_url`.

### Quality rules

- Per-slide character limits with clean truncation so text stays legible full-screen.
- No placeholder slides (the current "Swipe to continue" / "Ready to cook?" are removed).

## Selection & Eligibility

`getStories()` (generalizes the current logic):

- All **published** article types, **eligible** (see below), ordered by trending
  (`view_count`) over a recent window, with fallback to the most recent when too few.
- Limit **25**.
- Returns `StoryPreview[]` (ring data only).

`isStoryEligible(article)`:

- published, and
- has a usable cover image, and
- recipe → at least one step or ingredient; non-recipe → non-empty `short_description` or
  usable content.

`getStory(slug)` fetches the published article of any type by slug, returns `null` when
not found or not eligible.

## AMP Story Page — `src/pages/stories/[slug].astro`

SSR on Cloudflare (same pattern as `src/pages/recipes/[slug].astro`). `getStory(slug)` →
build → render. `redirect('/404')` when null. **Does not use `Layout.astro`** — it is a
standalone AMP document.

### Document structure

- `<html ⚡ lang>`; `<head>`:
  - AMP runtime `https://cdn.ampproject.org/v0.js` + `https://cdn.ampproject.org/v0/amp-story-1.0.js`
  - `<link rel="canonical" href="{canonical_url}">` (the story page itself)
  - AMP boilerplate (`<style amp-boilerplate>` + noscript variant)
  - exactly one `<style amp-custom>` (≤ 75KB)
  - Google Fonts (Playfair Display + Source Sans 3; an AMP-allowed font provider)
  - JSON-LD (`type="application/ld+json"`)
  - `<title>`
- `<body>`: `<amp-story standalone title publisher publisher-logo-src poster-portrait-src
  [poster-square-src] [poster-landscape-src]>`
  - per slide: `<amp-story-page id>` with two `<amp-story-grid-layer>`s —
    `template="fill"` (background `<amp-img layout="fill">`) and `template="vertical"`
    (text overlay: heading / body / items / meta).
  - CTA slide: `<amp-story-page-outlink>` → `target_url`.

### Strict-AMP constraints baked into the design

- **No custom JS** on this page (no islands, no client scripts beyond the AMP runtime and
  JSON-LD). The page bypasses `Layout.astro` and uses **no Astro scoped `<style>`** (which
  would inject hashed classes + a `<style>` tag). CSS is emitted via `is:inline` into the
  single `<style amp-custom>`.
- `pnpm dev` injects HMR/dev-toolbar scripts, so the page will not validate locally.
  AMP validity is checked in `pnpm preview` (production-like runtime) and with the AMP
  validator.

### Posters

`poster-portrait-src` is derived from the largest hero/thumbnail variant (ideally a 3:4
portrait crop ≥ 640×853; otherwise the best available image). Square/landscape posters are
added when available. v1 limitation: a true portrait crop may not exist for landscape-only
recipe photos — accepted for v1.

### schema.org

Reuse the already-generated `articles.jsonld_json` (Recipe for recipes) plus the canonical
to the story page. The embedded `Recipe` entity keeps `url` / `mainEntityOfPage` pointing
at `/recipes/<slug>` (same recipe; the story links to it) — intentional and correct.

### Brand styling (inlined)

Forest `#2a5c36` / sage `#6b8f71` / gold `#d8a43e`, white text, dark gradient overlays for
legibility (as in the current overlay). Token values are inlined (AMP forbids the site's
external CSS).

## Home Bar — `src/site/components/StoriesBar.astro` (rewritten)

- Circular rings (brand-gradient look preserved) = `<a href="/stories/<slug>">`,
  **accessible**: real links, `aria-label` "Voir la story : {titre}", visible focus,
  `prefers-reduced-motion` respected for entry animations.
- Include the standalone player once: `<script async
  src="https://cdn.ampproject.org/amp-story-player-v0.js">` +
  `<link rel="stylesheet" href="https://cdn.ampproject.org/amp-story-player-v0.css">`.
- A hidden `<amp-story-player>` listing all 25 story URLs as `<a>` children, plus a config
  `<script type="application/json">`: `controls` (`close` at `start`, `skip-to-next`),
  circular wrapping.
- Removes `window.STORIES_DATA`, the full-article dump, and all `console.log`.

### Client module — `src/site/scripts/stories-player.ts`

Typed, modeled on `src/site/scripts/toc-controller.ts`:

- Ring click → `preventDefault` → `player.show(url)` (the standard lightbox handles
  swipe / progress / keyboard / close).
- Listen for `amp-story-player-close` → restore body scroll; await the player `ready` event.
- **Progressive enhancement**: if the player script fails to load, the `<a>` navigates to
  the AMP page (no regression without JS). No `window` globals.

> `amp-story-player` reference: standalone script `amp-story-player-v0.js` + CSS
> `amp-story-player-v0.css`; lists stories as `<a href>`; JS API `show()`, `go(delta)`,
> `add()`; events `navigation` (`{index, remaining}`), `storyEnd`, `ready`; custom controls
> (`close`, `skip-to-next`) via an inner `<script type="application/json">`.

## Cleanup / Removal

- Delete `src/site/components/WebStoryViewer.astro` and its import/usage in `index.astro`.
- Move stories code out of `presenters.ts` into the new `stories/` module.
- Update `index.astro`: new `getStories()` preview shape; drop the viewer import.
- Remove all `console.log` and inline-style debugging from the story surface.

## New Contract Doc — `docs/WEB_STORY_CONTRACT.md`

Additive (allowed). Documents: the `Story` / `StorySlide` shape, selection/eligibility
rules, slide composition rules + caps, the AMP page output contract (required metadata,
posters, no-JS rule), and the `amp-story-player` config. No other contract is modified.

## Testing (Vitest)

- `build-story`: recipe → cover / ingredients (≤8 + "+N autres") / steps (≤7) / nutrition
  (only if validated) / cta; non-recipe → cover / info / cta; image pool resolution
  (public URLs only, **zero `r2_key`**, hero fallback, content images used); truncation;
  recipe with no steps/ingredients falls back to non-recipe composition.
- `build-preview`: ring shape, no `r2_key`.
- `eligibility`: published + cover + content rules; unpublished/empty excluded.
- `list`: ordering by `view_count`, recency fallback, limit 25, all types; `getStory(slug)`
  → `null` when ineligible. Extend `src/server/site-data/__tests__/site-data.test.ts`.
- Full AMP validity is verified manually in `pnpm preview` + the AMP validator (user-driven).

## Risks / Open Implementation Details

- **Content-image resolution helper** — pin the exact server-side helper that turns a
  `content_json` image marker into a public-URL snapshot during planning.
- **Portrait posters** — landscape-only photos yield a non-ideal portrait poster in v1.
- **Astro + strict AMP** — confirm the production build emits no extra `<style>`/`<script>`
  on the story route (no Layout, no scoped styles, no islands). Verify in `preview`.
- **`fetch any published article by slug`** — `getStory` needs a slug lookup without a
  fixed `type` filter (current `getArticleBySlug` takes a type).
- **No Subresource Integrity on AMP CDN scripts** — `v0.js`, `amp-story-1.0.js`, and
  `amp-story-player-v0.js` are intentionally loaded without `integrity`/`crossorigin`.
  The AMP runtime is continuously updated at a stable URL on the AMP CDN, and AMP
  validation forbids extra attributes on these tags; SRI would break both validity and
  runtime updates. The AMP CDN (`cdn.ampproject.org`) is the trusted, AMP-managed origin.
  This is a deliberate exception to the generic "add SRI to external scripts" guidance.
```
