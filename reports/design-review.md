# CSS / UI / Design Review

**Project:** Freecipies Blog (SaaS Astro Recipes)
**Review date:** 2026-06-13 (re-verified)
**Scope:** Public site (`src/site`), admin dashboard (`src/admin`), shared design tokens, Tailwind v4
configuration, accessibility, dark mode, and responsive layout.

---

## 0. Corrections vs. previous review

This is a re-verification of the prior `design-review.md`. Every claim was checked against the current
source. The prior report was directionally good but flagged **valid Tailwind v4 / canonical shadcn
syntax as broken** and overstated a few items. Removed/reframed below so nobody "fixes" working code.

| Prior item | Verdict | Why |
|---|---|---|
| 3.2 "Invalid variant syntax" (`has-data-[…]`, `in-data-[…]`, `group-data-[…]`, `[.border-b]:`, `--spacing(4)`) | **Removed — false positive** | All valid Tailwind v4; this is shadcn's official v4 `sidebar.tsx`/`card.tsx`/`toggle-group.tsx`. |
| 3.3 "`text-balance` → `text-wrap-balance`" | **Removed — wrong** | `text-balance` is the correct v4 utility. |
| 7.3 "invalid `calc(var(--spacing(4)))`" | **Removed — false positive** | `--spacing()` is a real v4 CSS function. |
| 5.7 "reduced-motion incomplete for `[data-block-root]`" | **Removed** | Covered by the global `*{transition-duration:0.01ms!important}` in `admin/index.css:438` **and** an explicit block in `block-editor-tokens.css:817-830`. |
| 2.1 self-referential `@theme` "breaks resolution" | **Downgraded to Low** | Emitted in `@layer theme`; the real values in `@layer tokens` win by cascade, so they resolve. Fragility smell, not a render bug. |
| 7.1 "media queries should use `--bp-*` tokens" | **Reframed** | Infeasible — CSS `@media` can't read `var()`. Tokens are reference-only. |
| 2.7 "duplicate `@keyframes skeleton-shimmer`" | **Reframed** | Three *different* shimmer keyframes; Astro scopes the one in `Skeleton.astro`, so no runtime collision. |
| 8.3 TagCard CLS "risk" | **Downgraded to Low** | Image sits in a fixed `var(--space-14)` box; shift is minimal. |

**Verdict:** the executive summary's brand identity ("sage/forest green + cream") is **correct** — it
is CLAUDE.md that is stale (see §9, finding 19).

---

## 1. Executive Summary

Two cleanly separated design surfaces:

- **Public site** — food-blog identity: **forest green `#2a5c36` + sage `#6b8f71` + golden accent
  `#d8a43e`** on warm cream, Playfair Display headings / Source Sans 3 body, Astro components with
  scoped `<style>` + Tailwind utilities, `data-surface="site"`.
- **Admin dashboard** — neutral CMS identity, blue primary, React SPA on shadcn/ui + Radix with CVA
  variants, `data-surface="admin"`.

Shared primitive tokens: `src/shared/design-tokens.css`. Surface themes:
`src/site/styles/site-theme.css`, `src/admin/styles/admin-theme.css`.

The architecture is sound. The issues that remain are **two functional breakages** (dead animation
utilities, an undefined token), an **incomplete/non-persistent admin dark mode**, a handful of
accessibility gaps, and maintainability drift between the two surfaces' token systems.

---

## 2. CSS / Token Architecture

### Strengths
- Centralized primitive tokens for color, spacing, radii, motion, z-index, breakpoints
  (`design-tokens.css`).
- Public site has a complete light/dark palette (`site-theme.css`).
- Both surfaces use cascade layers (`@layer`) and custom properties.

### Issues

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 2.1 | **High** | **`--primary-muted` is used but never defined** → active highlights render with no background. Used in 3 places; defined nowhere. **Fix:** define `--primary-muted: hsl(var(--primary) / 0.08)` (matches the sidebar active style at `admin/index.css:124-128`) or inline that expression. | `block-editor-tokens.css:617`, `features/settings/components/SettingsLayout.tsx:124`, `features/homepage/components/HomepageLayout.tsx:133` |
| 2.2 | Med-High | **Radius scale divergence** — admin `@theme` redefines `--radius-xs/sm/md/lg/xl` to `2/4/8/12/16`, conflicting with shared `@layer tokens` `4/8/12/16/24`. Because `@layer tokens` overrides Tailwind's `@layer theme`, the admin's tighter intent is silently dropped for `var(--radius-*)` consumers. Pick one source of truth. | `admin/index.css:44-48`, `design-tokens.css:86-91` |
| 2.3 | Low-Med | **Competing admin token systems** — hex (`--brand-primary`, `--bg`, `--text`) coexist with HSL shadcn tokens (`--primary`, `--muted`, …). In dark mode only the HSL set is recolored; the hex set is not (see §6). | `admin/styles/admin-theme.css` |
| 2.4 | Low | **Self-referential `@theme` aliases** — `--font-sans: var(--font-sans)`, `--shadow-sm: var(--shadow-sm)`. Works today (Tailwind emits these in `@layer theme`, the real `@layer tokens` value wins), but fragile. Prefer `@theme inline` or rename the source tokens. | `site/styles/global.css:39-52`, `admin/index.css:39-54` |
| 2.5 | Low | **Site `@theme` doesn't map `--spacing-*`** (admin does at `index.css:57-67`). Tailwind's default spacing still works, but the surfaces are inconsistent. | `site/styles/global.css` |
| 2.6 | Low | **Redundant `::selection`** — a scoped `[data-surface="site"] ::selection` and an identical global `::selection`. | `site/styles/global.css:197, 660` |
| 2.7 | Low | **Divergent shimmer keyframes** — `@keyframes shimmer` in `global.css` (likely dead — site `Skeleton.astro` uses its own scoped `skeleton-shimmer`), scoped `skeleton-shimmer` (translateX) in `Skeleton.astro`, and a *different* `skeleton-shimmer` (background-position) in `admin/index.css`. No collision (Astro scopes its name) but three inconsistent definitions. | `global.css:651`, `ui/Skeleton.astro:53`, `admin/index.css:312` |

---

## 3. Tailwind v4 Configuration & Usage

### Strengths
- Correctly config-less: `@theme` in CSS, no `tailwind.config`.
- Admin uses canonical shadcn v4 component syntax (`has-data-*`, `in-data-*`, `group-data-*`,
  `--spacing()`) — all valid; **not** flagged here.

### Issues

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 3.1 | **High** | **Animation utilities are dead.** Neither `tailwindcss-animate` nor its v4 successor `tw-animate-css` is in `package.json` or `@import`ed anywhere. Yet `animate-in/out`, `fade-in/out-0`, `zoom-in-95`, `slide-in-from-*` are used in **27 admin files** (dialogs, sheets, dropdowns, tooltips, popovers, selects, …). These classes generate no CSS, so overlays open/close with no transition. **Fix:** `pnpm add tw-animate-css` + `@import "tw-animate-css";` at the top of `admin/index.css`, or strip the dead classes. | `package.json`, `ui/dialog.tsx`, `ui/sheet.tsx`, `ui/dropdown-menu.tsx`, `ui/tooltip.tsx`, … |
| 3.2 | Low | **Arbitrary `var(--*)` where theme utilities exist** — e.g. `bg-[var(--bg-elevated)]` → `bg-card`, `bg-[var(--bg)]` → `bg-background` (the site `@theme` maps these at `global.css:14-37`). Maintainability only. | Widespread in `src/site/components/*.astro` |
| 3.3 | Low | **Magic-number arbitrary values** — `text-[10px]`, `w-[260px]`, `max-w-[400px]`, `h-[calc(...)]`. Prefer type/size tokens. | `ui/table.tsx`, `BlockEditor/components/*.tsx` |

---

## 4. UI Component Design

### Strengths
- Site primitives (Button, Badge, Card, SectionTitle, Icon, Skeleton) are intentional Astro components.
- Admin uses a mature shadcn/ui + Radix library with CVA variants.

### Issues

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 4.1 | Low (by design) | **Two Button implementations** (site `.ui-btn` vs admin shadcn `button.tsx`) and **two Badge implementations** (site semantic `diet/time/difficulty/eco` vs admin `default/secondary/destructive/outline`). This surface split is intentional per CLAUDE.md — **document** the divergence rather than unify. | `site/components/ui/Button.astro`, `admin/ui/button.tsx`, `site/components/ui/Badge.astro`, `admin/ui/badge.tsx` |
| 4.2 | Low | **Large scoped `<style>` blocks + mixed arbitrary values** in site cards reduce auditability. | `site/components/RecipeCard.astro`, `ArticleCard.astro`, `RoundupItemList.astro`, `content/NutritionFacts.astro` |
| 4.3 | Low | **Micro-typography hard-coded** (`text-[10px]`, `text-[11px]`) instead of type tokens. | `ui/table.tsx`, `BlockEditor/components/*.tsx` |

---

## 5. Accessibility

### Strengths
- Site `Header.astro` has a working skip link; global `:focus-visible` uses a real `outline`.
- Admin inherits good keyboard semantics from Radix.
- `prefers-reduced-motion` is handled globally on **both** surfaces (`global.css:261`,
  `admin/index.css:438`), including the block editor.

### Issues

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 5.1 | Med | **No skip link in the admin SPA** — only `sr-only` labels inside shadcn parts. Add a "skip to content" link. | `pages/admin/[...path].astro`, `admin/components/AdminLayout.tsx` |
| 5.2 | Med | **Box-shadow-only focus rings.** `.ui-btn:focus-visible { outline: none; box-shadow: var(--shadow-focus) }`. `box-shadow` is **not painted in forced-colors / Windows High Contrast mode**, so focus becomes invisible there. Keep a transparent `outline` fallback alongside the shadow. | `site/components/ui/Button.astro:62-65` (also `ThemeToggle.astro`, `Header.astro`) |
| 5.3 | Med | **`table { display: block }`** can drop native table semantics for assistive tech. The intent is horizontal scroll — wrap the table in an `overflow-x:auto` container and keep `display: table`. | `site/styles/global.css:138-143` |
| 5.4 | Low | **Mobile nav & search modal are not focus-trapped.** | `site/components/Header.astro` |
| 5.5 | Low | **`prefers-contrast: high` forces `color:#000` and a black focus ring** regardless of dark mode, and removes `box-shadow` on `.card/.button/...` — fine for those, but reinforces 5.2 (don't rely on shadow for focus). | `site/styles/global.css:274-333` |

---

## 6. Dark Mode

### Strengths
- Public-site dark mode is well wired: anti-FOUC script, theme toggle, `html.dark`, full palette
  override including feedback colors (`site-theme.css:73-132`).

### Issues

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 6.1 | Med-High | **Admin theme is not persisted** — `useUIStore` has no `persist` middleware and defaults to `'light'`, so dark resets on every reload. | `admin/store/useStore.ts:42-51` |
| 6.2 | Med-High | **No anti-FOUC for admin** — `ThemeProvider` applies `.dark` in a post-hydration `useEffect`, and the page is `client:only="react"` with no inline pre-hydration theme script → flash/blank before theme applies. | `admin/components/ThemeProvider.tsx:12-19`, `pages/admin/[...path].astro` |
| 6.3 | Med | **Admin dark mode doesn't recolor** `--brand-primary` (stays `#2563eb`) or `--success/--warning/--error/--info` (inherited light values) — only `--bg*/--text*/--border*`, shadows, and the HSL shadcn set are overridden. Light-mode brand/feedback colors bleed onto dark. | `admin/styles/admin-theme.css:78-124` |
| 6.4 | Med | **Two "primary" blues in admin dark** — `--brand-primary` `#2563eb` vs `hsl(var(--primary))` = `217 91% 60%`. Components mixing the two systems look inconsistent. | `admin/styles/admin-theme.css`, `admin/index.css:20` |
| 6.5 | Low | **Block editor forces `color: hsl(var(--foreground)) !important`** on `p`, headings, and `[data-content-type]` — intentional dark-mode contrast enforcement that can override custom-block text colors. | `block-editor-core.css:372-390` |

---

## 7. Responsive / Layout

### Strengths
- Container-query utilities exist and are used (`global.css:358-438`).
- Admin uses `svh` units to avoid mobile URL-bar issues.
- Breakpoint **tokens** (`--bp-sm/md/lg`) exist for reference; note they cannot be used inside raw
  `@media` (CSS limitation), so literal px there is expected — keep them consistent with 640/768/1024.

### Issues

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 7.1 | Med | **Admin mobile grid override too broad** — `@media (max-width:640px){ .grid-cols-2/.grid-cols-3/.grid-cols-4 { grid-template-columns:1fr !important } }` forces *every* such grid to one column. Scope to the intended forms. | `admin/index.css:414-420` |
| 7.2 | Low | **Overlapping editor breakpoints** — `:root` overrides at `767px`, `768px`, and `480px` partly duplicate each other. Consolidate to one mobile breakpoint. | `block-editor-tokens.css:707, 888, 911` |

---

## 8. Performance / Quality

| # | Sev | Issue | Location |
|---|-----|-------|----------|
| 8.1 | Med | **Duplicate `.bn-form-popover`** with divergent `border-radius`, `max-width`, and `padding` (e.g. `min(320px,75vw)` vs `min(20rem,75vw)`; `var(--radius-lg)` vs `8px`). Consolidate into one. | `admin/index.css:162-206`, `block-editor-core.css:292-335` |
| 8.2 | Low | **Heavy `!important`** in the block editor makes future theming/debugging harder (largely necessary to override BlockNote/Mantine, but worth auditing). | `block-editor-core.css` |
| 8.3 | Low | **Likely-dead rules** to verify/prune: `@keyframes shimmer` (`global.css`), `.editor-toolbar` responsive (`admin/index.css`). | `global.css:651`, `admin/index.css:428-436` |
| 8.4 | Low | **`TagCard.astro` image lacks `width`/`height` attrs.** CLS impact is small (fixed `var(--space-14)` container), but adding them is good practice. | `site/components/TagCard.astro:25-29` |
| 8.5 | Low | **No public-site print stylesheet** beyond the recipe print overlay. | `site/components/content/PrintRecipeOverlay.astro` |

---

## 9. Recommended Priority Order

| Priority | Issue | Rationale |
|----------|-------|-----------|
| **High** | Install/import `tw-animate-css` (or remove dead `animate-*` classes) | Admin overlays animate silently across 27 files (broken UX). |
| **High** | Define (or replace) `--primary-muted` | Active structure items + settings/homepage tabs have invisible highlights. |
| **Med-High** | Resolve the radius-scale divergence (one source of truth) | Admin's tighter-radius intent is silently dropped. |
| **Med-High** | Complete admin dark mode — persist theme, pre-hydration script, recolor brand/feedback tokens | Currently session-only, flashes, and mixes light/dark colors. |
| **Med** | Keep an `outline` fallback for focus (forced-colors) | Box-shadow-only focus is invisible in Windows High Contrast. |
| **Med** | Add an admin skip link | Keyboard a11y parity with the site. |
| **Med** | Wrap scrolling tables instead of `table{display:block}` | Preserves table semantics for AT. |
| **Med** | Consolidate duplicate `.bn-form-popover`; scope the mobile grid override | Removes conflicting/over-broad rules. |
| **Low** | Consolidate token systems, prune dead rules, document site/admin primitive split | Long-term maintainability. |

---

## 10. Next Steps

1. **Fix the two High items first** (dead `animate-*`, `--primary-muted`) — both are functional
   breakages with small, contained fixes.
2. **Plan an admin dark-mode pass:** add `persist` to `useUIStore`, an inline pre-hydration theme
   script on the admin page, and dark overrides for `--brand-primary` + feedback tokens.
3. **Accessibility pass:** admin skip link, forced-colors focus fallback, scrolling-table wrapper,
   focus-trap mobile nav/search.
4. **Documentation drift — fix CLAUDE.md:** the Design section says "coral/orange brand," but the live
   site theme is forest/sage green + golden accent (`site-theme.css:9-18`). Fonts (Playfair Display +
   Source Sans 3) are correct. Update the brand-color line.
5. After any source changes, run `pnpm dev` (spot-check the two High items) and `pnpm test`.
