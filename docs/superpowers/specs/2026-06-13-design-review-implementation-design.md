# Design — Implement the CSS/UI Review (High + Med)

**Date:** 2026-06-13
**Source:** `reports/design-review.md` (re-verified review)
**Scope decision:** High + Medium findings only. Low cosmetic findings are explicitly out of scope.

## Context

The re-verified design review (`reports/design-review.md`) found two functional breakages and a set of
correctness/accessibility/dark-mode issues across the admin and public surfaces. This spec implements
the **High + Medium** tier. The three design forks were resolved with the user:

- **Animations:** add `tw-animate-css` (restore intended shadcn v4 animations).
- **Radius:** keep the shared token scale; delete the dead admin override (no visual change).
- **Dark mode:** Zustand `persist` + an inline pre-hydration script (consistent with the existing
  `useAuthStore` persist pattern).

No database, JSON contract, or API shape changes. No `docs/` contract files are modified.

## Goals

Implement, in priority order:

1. **3.1 (High)** — restore the dead `animate-*` / `fade-*` / `zoom-*` / `slide-*` utilities.
2. **2.1 (High)** — define the undefined `--primary-muted` token.
3. **2.2 (Med-High)** — make the radius scale single-source.
4. **6.1–6.4 (Med-High)** — persist admin theme, kill the FOUC, complete dark recoloring.
5. **5.1 / 5.2 / 5.3 (Med)** — admin skip link, forced-colors-safe focus, table semantics.
6. **8.1 / 7.1 (Med)** — de-duplicate `.bn-form-popover`, scope the mobile grid override.

## Non-Goals

All Low findings: token-system consolidation (2.3), self-referential `@theme` (2.4), site `@theme`
spacing/`::selection` gaps (2.5/2.6), shimmer-keyframe consolidation (2.7), arbitrary-value swaps
(3.2/3.3), primitive-doc divergence (4.x), block-editor `!important` audit (8.2), dead-rule pruning
(8.3), TagCard `width`/`height` (8.4), print stylesheet (8.5).

---

## Detailed Design

### A. Dead animation utilities (3.1)

**Problem:** Neither `tailwindcss-animate` nor `tw-animate-css` is installed or imported, so
`animate-in/out`, `fade-in/out-0`, `zoom-in-95`, `slide-in-from-*` (used in 27 admin files) generate
no CSS. Overlays open/close with no transition.

**Change:**
- `pnpm add tw-animate-css`.
- Add `@import "tw-animate-css";` immediately after `@import "tailwindcss";` at the top of
  `src/admin/index.css`.

**Why this file:** `admin/index.css` is the admin bundle's CSS entry; the utilities are only used in
admin. The public site does not use these classes.

**Verify:** `pnpm dev` → admin → open a dialog/dropdown/tooltip → enter/exit animation plays.

### B. Undefined `--primary-muted` (2.1)

**Problem:** `var(--primary-muted)` is consumed in three places but defined nowhere → active
highlights have no background:
- `src/admin/components/BlockEditor/styles/block-editor-tokens.css:617` (`.structure-item.is-active`)
- `src/admin/features/settings/components/SettingsLayout.tsx:124` (`bg-[var(--primary-muted)]`)
- `src/admin/features/homepage/components/HomepageLayout.tsx:133` (`bg-[var(--primary-muted)]`)

**Change:** Define the token once in `src/admin/styles/admin-theme.css`, inside the
`:root, [data-surface="admin"]` block alongside the shadcn HSL variables:

```css
--primary-muted: hsl(var(--primary) / 0.08);
```

Because it references `--primary` — which **is** recolored in the `.dark` block — it adapts to dark mode
automatically. No second definition needed. `0.08` matches the existing active sidebar style at
`admin/index.css:124-128` (`hsl(var(--primary) / 0.08)`).

**Verify:** Active structure-panel item and the active settings/homepage tab show a faint blue fill in
both light and dark.

### C. Radius source of truth (2.2)

**Problem:** `admin/index.css` `@theme` redefines `--radius-xs/sm/md/lg/xl` to `2/4/8/12/16`, but the
shared `@layer tokens` (`design-tokens.css:86-91`, `4/8/12/16/24`) wins by cascade-layer precedence, so
admin already renders the softer shared scale. The override is dead and misleading.

**Change:** Delete lines 43–48 (the `/* Radii */` block) from the `@theme` in `src/admin/index.css`.
Admin then explicitly inherits the shared scale it already uses.

**Verify:** No visual change. `grep` confirms the `--radius-*` override is gone from `admin/index.css`.

### D. Admin dark mode (6.1–6.4)

**Problem:** `useUIStore` has no `persist` (resets to light on reload); theme is applied post-hydration
with no inline script (FOUC); dark block doesn't recolor `--brand-primary` or feedback tokens.

**Changes:**

1. **Persist** — in `src/admin/store/useStore.ts`, wrap `useUIStore` with `persist` (already imported
   and used by `useAuthStore`):
   - `name: 'freecipies-ui'`
   - `partialize`: persist `theme` and `sidebarOpen` only (not the action functions).

2. **Anti-FOUC inline script** — in `src/pages/admin/[...path].astro`, add a `<script is:inline>` in
   `<head>` that runs before paint:
   ```js
   try {
     const persisted = JSON.parse(localStorage.getItem('freecipies-ui') || '{}');
     if (persisted?.state?.theme === 'dark') document.documentElement.classList.add('dark');
   } catch {}
   ```
   This matches the Zustand-persist JSON shape (`{ state: { theme }, version }`). `ThemeProvider`
   continues to reconcile `.dark` reactively after hydration.

3. **Recolor dark tokens** — in the `[data-surface="admin"].dark, [data-surface="admin"] .dark` block
   of `src/admin/styles/admin-theme.css`, add:
   - `--brand-primary` / `--brand-primary-hover` / `--brand-primary-light` tracking the dark
     `hsl(var(--primary))` (`217 91% 60%` ≈ `#3b82f6`; hover lighter `#60a5fa`; light a dark tint).
   - Dark feedback set `--success/--warning/--error/--info` plus `-bg`/`-text`, reusing the values the
     public site already uses in dark (`site-theme.css:110-122`): success `#34d399`/`#064e3b`/`#6ee7b7`,
     warning `#fbbf24`/`#451a03`/`#fcd34d`, error `#f87171`/`#450a0a`/`#fca5a5`,
     info `#60a5fa`/`#1e3a8a`/`#93c5fd`.

**Verify:** Toggle dark → reload → stays dark with no white flash; brand buttons/links and
success/warning/error/info chips use dark-appropriate colors.

### E. Accessibility (5.1, 5.2, 5.3)

1. **Admin skip link (5.1)** — in `src/admin/components/AdminLayout.tsx`, add
   `<a href="#admin-main" className="skip-link">Skip to content</a>` as the first focusable element and
   `id="admin-main"` on the main content region. Add an admin `.skip-link` rule to `admin/index.css`
   mirroring the site one (`global.css:242-258`), since the site stylesheet is not loaded in admin.

2. **Forced-colors-safe focus (5.2)** — in `src/site/components/ui/Button.astro:62-65`, change
   `outline: none` to a transparent outline so focus survives forced-colors / Windows High Contrast:
   ```css
   .ui-btn:focus-visible {
     outline: 2px solid transparent;
     outline-offset: 2px;
     box-shadow: var(--shadow-focus);
   }
   ```
   Apply the same change to `ThemeToggle.astro` and `Header.astro` if they use the
   `outline: none` + `box-shadow` focus pattern (check during implementation).

3. **Table semantics (5.3)** — in `src/site/styles/global.css:138-143`, remove `display: block`
   (and the `overflow-x: auto` that depends on it) from the bare `table` rule, keeping
   `width: 100%; border-collapse: collapse`. Move horizontal scroll to a wrapper at the table render
   layer (locate the site/content table renderer during implementation and wrap output tables in an
   `overflow-x: auto` container). This preserves the native table role for assistive tech.

**Verify:** Tab on admin load reveals the skip link; button focus ring is visible under forced-colors;
site content tables still scroll horizontally on narrow screens and expose table semantics.

### F. CSS hygiene (8.1, 7.1)

1. **De-duplicate `.bn-form-popover` (8.1)** — the selector is defined in both `admin/index.css:162`
   and `block-editor-core.css:292` with divergent `border-radius` / `max-width` / `padding`. Keep the
   base definition in `admin/index.css` (always loaded) and remove the duplicated base block from
   `block-editor-core.css`, retaining only rules that genuinely differ plus the existing `!important`
   enforcement block (`block-editor-core.css:398-411`). Reconcile the divergent values to the
   `admin/index.css` base.

2. **Scope the mobile grid override (7.1)** — replace the blanket
   `@media (max-width:640px){ .grid-cols-2/.grid-cols-3/.grid-cols-4 { grid-template-columns:1fr !important } }`
   in `admin/index.css:414-420` with an opt-in utility `.admin-grid-stack` (same media query, scoped to
   that class). Audit current `.grid-cols-{2,3,4}` usages in admin forms and add `admin-grid-stack`
   where single-column mobile stacking is intended.

**Verify:** Editor link/image popovers look consistent (one definition); admin forms that previously
stacked on mobile still stack; grids that should stay multi-column on mobile are no longer forced to one.

---

## Testing Strategy

- **Unit-testable (Vitest):**
  - `useUIStore` persistence: store config persists `theme`/`sidebarOpen` under `freecipies-ui` and
    rehydrates.
  - The anti-FOUC theme-read logic: extract the localStorage→`dark` decision into a tiny pure helper and
    test it against the persisted JSON shape (valid dark, valid light, missing/corrupt → no throw).
- **Inspection + `pnpm dev` spot-checks** for the pure-CSS changes (A, C, E-focus/tables, F) and the
  rendered dark-mode result (D-3), since they are not unit-testable.
- **Regression:** `pnpm test` and `pnpm check:boundaries` stay green. No contract files touched.

## Files Touched (summary)

| Area | Files |
|------|-------|
| A | `package.json`, `src/admin/index.css` |
| B | `src/admin/styles/admin-theme.css` |
| C | `src/admin/index.css` |
| D | `src/admin/store/useStore.ts`, `src/pages/admin/[...path].astro`, `src/admin/styles/admin-theme.css` |
| E | `src/admin/components/AdminLayout.tsx`, `src/admin/index.css`, `src/site/components/ui/Button.astro`, (`ThemeToggle.astro`, `Header.astro` if applicable), `src/site/styles/global.css`, site table render component |
| F | `src/admin/index.css`, `src/admin/components/BlockEditor/styles/block-editor-core.css`, admin form components using `grid-cols-*` |

## Rollout / Risk

- Lowest-risk first: A, B, C (additive or no-op). Then D (store + script + tokens). Then E, F (touch
  shared CSS — verify both surfaces).
- The two highest-touch items are E-tables (find the right wrapper point) and F-grid (usage audit);
  both are isolated and inspection-verifiable.
- All changes are presentational/state-local; no data or contract surface is affected.
